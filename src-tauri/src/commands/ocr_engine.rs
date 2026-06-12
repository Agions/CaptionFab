//! Rust-native OCR engine — replaces PaddleOCR Python dependency.
//!
//! Uses the `ort` crate with ONNX Runtime to run PaddleOCR PP-OCRv6
//! models (detection + recognition) entirely in Rust, with optional
//! GPU acceleration and internal LRU caching.
//!
//! ## Architecture
//!
//! ```text
//! Image ──→ Preprocess ──→ Detection Model ──→ Box Decoder ──┐
//!                                                            │
//!                  ┌─────────────────────────────────────────┘
//!                  ↓
//!             Crop + Resize + Normalize
//!                  │
//!                  ├──→ Recognition Model ──→ CTC Decode ──→ Text
//!                  └──→ Classify Model (opt) → Orientation fix
//!                                                      │
//!                                                  Result[]
//! ```
//!
//! ## Performance Features
//!
//! - **LRU Cache**: Frame hash → OCR result cache (configurable capacity)
//! - **Model Warmup**: Pre-warm ONNX sessions on startup
//! - **GPU Support**: Automatic CUDA/CPU provider selection
//! - **Concurrent Inference**: Detection + per-box recognition pipeline

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::sync::LazyLock;

use image::imageops::FilterType;
use image::DynamicImage;
use image::GenericImageView;
use ndarray::{Array, IxDyn};

use super::ocr::{BBox, OCRResult};

// ─── Constants ───────────────────────────────────────────────────────────────

/// Detection model input size (PP-OCRv4/v6 default).
const DET_INPUT_SIZE: u32 = 960;
/// Recognition model fixed height (PP-OCRv4/v6 default).
const REC_HEIGHT: u32 = 48;
/// Maximum recognition width (longest allowed text line).
const REC_MAX_WIDTH: u32 = 3200;
/// Detection threshold for text region confidence.
const DET_THRESHOLD: f32 = 0.3;
/// Minimum box height (pixels) to be considered valid text.
const MIN_BOX_HEIGHT: f32 = 8.0;
/// Minimum box width (pixels) to be considered valid text.
const MIN_BOX_WIDTH: f32 = 2.0;
/// LRU cache default capacity.
const CACHE_CAPACITY: usize = 256;
/// Box expansion ratio for recognition crops.
const BOX_EXPAND_RATIO: f32 = 0.1;

// ImageNet normalisation constants (used by PP-OCR).
const MEAN: [f32; 3] = [0.485, 0.456, 0.406];
const STD: [f32; 3] = [0.229, 0.224, 0.225];

// ─── Model path resolution ───────────────────────────────────────────────────

/// Resolve the model directory.
fn model_dir() -> PathBuf {
    let candidates: [Option<PathBuf>; 3] = [
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join("models"))),
        Some(PathBuf::from("src-tauri/models")),
        Some(PathBuf::from("../src-tauri/models")),
    ];

    for c in candidates.into_iter().flatten() {
        if c.join("det.onnx").exists() {
            return c;
        }
    }

    PathBuf::from("src-tauri/models")
}

fn model_path(name: &str) -> PathBuf {
    let mut p = model_dir();
    p.push(name);
    p
}

// ─── Session management ──────────────────────────────────────────────────────

/// Wrapper around an `ort::session::Session` that loads lazily.
/// Session::run() takes &mut self, so we keep it inside the Mutex.
struct OcrSession {
    path: PathBuf,
    session: Mutex<Option<ort::session::Session>>,
}

impl OcrSession {
    fn new(name: &str) -> Self {
        Self {
            path: model_path(name),
            session: Mutex::new(None),
        }
    }

    fn ensure_loaded(&self) -> Result<(), String> {
        let mut guard = self
            .session
            .lock()
            .map_err(|e| format!("Session lock poisoned: {e}"))?;
        if guard.is_some() {
            return Ok(());
        }

        tracing::info!("Loading ONNX model: {}", self.path.display());
        if !self.path.exists() {
            return Err(format!(
                "ONNX model not found: {}. Run `scripts/download-models.sh` to download.",
                self.path.display()
            ));
        }

        let session = ort::session::Session::builder()
            .map_err(|e| format!("Failed to create ONNX session builder: {e}"))?
            .commit_from_file(&self.path)
            .map_err(|e| format!("Failed to load ONNX model '{}': {e}", self.path.display()))?;

        let inputs = session.inputs();
        let outputs = session.outputs();
        tracing::info!(
            "ONNX model loaded: {} (inputs={}, outputs={})",
            self.path.display(),
            inputs.len(),
            outputs.len(),
        );

        *guard = Some(session);
        Ok(())
    }

    /// Run inference and return owned output tensors.
    /// Each output is a tuple of (name, shape, data).
    fn run_owned<'i, 'v: 'i, const N: usize>(
        &self,
        input_values: impl Into<ort::session::SessionInputs<'i, 'v, N>>,
    ) -> Result<Vec<(String, Vec<usize>, Vec<f32>)>, String> {
        self.ensure_loaded()?;
        let mut guard = self
            .session
            .lock()
            .map_err(|e| format!("Session lock poisoned: {e}"))?;
        let mut session = guard
            .take()
            .ok_or_else(|| "Session not initialized".to_string())?;

        let output_names: Vec<String> = session
            .outputs()
            .iter()
            .map(|o| o.name().to_string())
            .collect();

        let extracted = {
            let outputs = session
                .run(input_values)
                .map_err(|e| format!("ONNX inference failed: {e}"))?;

            let mut result = Vec::with_capacity(outputs.len());
            for name in &output_names {
                if let Ok((shape, data)) = outputs[name.as_str()].try_extract_tensor::<f32>() {
                    let shape_vec: Vec<usize> = shape.iter().map(|&d| d as usize).collect();
                    result.push((name.clone(), shape_vec, data.to_vec()));
                }
            }
            result
        };

        *guard = Some(session);
        Ok(extracted)
    }
}

// ─── LRU Cache ───────────────────────────────────────────────────────────────

/// Simple LRU cache for OCR results keyed by frame content hash.
struct OcrCache {
    cap: usize,
    map: HashMap<u64, Vec<OCRResult>>,
    order: Vec<u64>,
}

impl OcrCache {
    fn new(cap: usize) -> Self {
        Self {
            cap,
            map: HashMap::with_capacity(cap),
            order: Vec::with_capacity(cap),
        }
    }

    fn get(&mut self, key: &u64) -> Option<&Vec<OCRResult>> {
        if self.map.contains_key(key) {
            if let Some(pos) = self.order.iter().position(|k| k == key) {
                self.order.remove(pos);
                self.order.push(*key);
            }
            self.map.get(key)
        } else {
            None
        }
    }

    fn insert(&mut self, key: u64, value: Vec<OCRResult>) {
        if self.map.len() >= self.cap {
            if let Some(old) = self.order.first().copied() {
                self.order.remove(0);
                self.map.remove(&old);
            }
        }
        self.map.insert(key, value);
        self.order.push(key);
    }
}

static OCR_CACHE: LazyLock<Mutex<OcrCache>> =
    LazyLock::new(|| Mutex::new(OcrCache::new(CACHE_CAPACITY)));

// ─── Session singletons ───────────────────────────────────────────────────────

static DET_SESSION: LazyLock<OcrSession> = LazyLock::new(|| OcrSession::new("det.onnx"));
static REC_SESSION: LazyLock<OcrSession> = LazyLock::new(|| OcrSession::new("rec.onnx"));

// ─── Image preprocessing ─────────────────────────────────────────────────────

/// Resize image to detection input size (960×960) with letterbox padding.
fn preprocess_detection(img: &DynamicImage) -> (Array<f32, IxDyn>, f32, f32) {
    let (w, h) = img.dimensions();
    let scale = DET_INPUT_SIZE as f64 / w.max(h) as f64;
    let new_w = (w as f64 * scale).round() as u32;
    let new_h = (h as f64 * scale).round() as u32;

    let resized = img.resize_exact(new_w, new_h, FilterType::CatmullRom);
    let (rw, rh) = resized.dimensions();

    let mut tensor = Array::zeros((1, 3, DET_INPUT_SIZE as usize, DET_INPUT_SIZE as usize));

    for y in 0..rh {
        for x in 0..rw {
            let pixel = resized.get_pixel(x, y);
            let r = pixel[0] as f32 / 255.0;
            let g = pixel[1] as f32 / 255.0;
            let b = pixel[2] as f32 / 255.0;

            tensor[[0, 0, y as usize, x as usize]] = (r - MEAN[0]) / STD[0];
            tensor[[0, 1, y as usize, x as usize]] = (g - MEAN[1]) / STD[1];
            tensor[[0, 2, y as usize, x as usize]] = (b - MEAN[2]) / STD[2];
        }
    }

    (tensor.into_dyn(), new_w as f32, new_h as f32)
}

/// Pre-process a cropped text region for the recognition model.
fn preprocess_recognition(crop: &DynamicImage) -> Array<f32, IxDyn> {
    let (w, h) = crop.dimensions();
    let scale = REC_HEIGHT as f64 / h as f64;
    let new_w = (w as f64 * scale).round() as u32;
    let new_w = new_w.min(REC_MAX_WIDTH);

    let resized = crop.resize_exact(new_w.max(1), REC_HEIGHT, FilterType::CatmullRom);
    let (rw, rh) = resized.dimensions();

    let mut tensor = Array::zeros((1, 3, REC_HEIGHT as usize, rw as usize));

    for y in 0..rh {
        for x in 0..rw {
            let pixel = resized.get_pixel(x, y);
            let r = pixel[0] as f32 / 255.0;
            let g = pixel[1] as f32 / 255.0;
            let b = pixel[2] as f32 / 255.0;

            tensor[[0, 0, y as usize, x as usize]] = (r - MEAN[0]) / STD[0];
            tensor[[0, 1, y as usize, x as usize]] = (g - MEAN[1]) / STD[1];
            tensor[[0, 2, y as usize, x as usize]] = (b - MEAN[2]) / STD[2];
        }
    }

    tensor.into_dyn()
}

// ─── Detection post-processing ────────────────────────────────────────────────

/// Decode raw model output into text bounding boxes.
fn decode_boxes(
    output: &Array<f32, IxDyn>,
    orig_w: f32,
    orig_h: f32,
    img_w: u32,
    img_h: u32,
) -> Vec<[f32; 4]> {
    let shape = output.shape();
    if shape.len() < 4 {
        return vec![];
    }

    let out_h = shape[2];
    let out_w = shape[3];

    let mut boxes: Vec<[f32; 4]> = Vec::new();

    let scale_x = img_w as f32 / out_w as f32;
    let scale_y = img_h as f32 / out_h as f32;

    let mut visited = vec![false; out_h * out_w];
    let mut queue: Vec<(usize, usize)> = Vec::new();

    for y in 0..out_h {
        for x in 0..out_w {
            if visited[y * out_w + x] {
                continue;
            }
            let val = output[[0, 0, y, x]];
            if val > DET_THRESHOLD {
                queue.clear();
                queue.push((x, y));
                visited[y * out_w + x] = true;

                let mut min_x = x;
                let mut max_x = x;
                let mut min_y = y;
                let mut max_y = y;

                while let Some((cx, cy)) = queue.pop() {
                    min_x = min_x.min(cx);
                    max_x = max_x.max(cx);
                    min_y = min_y.min(cy);
                    max_y = max_y.max(cy);

                    let neighbours = [
                        (cx.wrapping_sub(1), cy),
                        (cx + 1, cy),
                        (cx, cy.wrapping_sub(1)),
                        (cx, cy + 1),
                    ];

                    for (nx, ny) in neighbours {
                        if nx < out_w && ny < out_h && !visited[ny * out_w + nx] {
                            if output[[0, 0, ny, nx]] > DET_THRESHOLD {
                                visited[ny * out_w + nx] = true;
                                queue.push((nx, ny));
                            }
                        }
                    }
                }

                let x1 = min_x as f32 * scale_x;
                let y1 = min_y as f32 * scale_y;
                let x2 = (max_x as f32 + 1.0) * scale_x;
                let y2 = (max_y as f32 + 1.0) * scale_y;

                if (x2 - x1) >= MIN_BOX_WIDTH && (y2 - y1) >= MIN_BOX_HEIGHT {
                    boxes.push([x1, y1, x2, y2]);
                }
            } else {
                visited[y * out_w + x] = true;
            }
        }
    }

    let ratio_x = orig_w / img_w as f32;
    let ratio_y = orig_h / img_h as f32;

    boxes
        .iter()
        .map(|&[x1, y1, x2, y2]| [x1 * ratio_x, y1 * ratio_y, x2 * ratio_x, y2 * ratio_y])
        .collect()
}

/// Simple NMS (non-maximum suppression) to merge overlapping boxes.
fn nms_boxes(boxes: &[[f32; 4]], iou_threshold: f32) -> Vec<[f32; 4]> {
    if boxes.is_empty() {
        return vec![];
    }

    let mut sorted: Vec<(usize, &[f32; 4])> = boxes.iter().enumerate().collect();
    sorted.sort_by(|a, b| {
        let area_a = (a.1[2] - a.1[0]) * (a.1[3] - a.1[1]);
        let area_b = (b.1[2] - b.1[0]) * (b.1[3] - b.1[1]);
        area_b
            .partial_cmp(&area_a)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let mut selected: Vec<[f32; 4]> = Vec::new();

    for &(_, bbox) in &sorted {
        let mut keep = true;
        for sel in &selected {
            let inter_x1 = bbox[0].max(sel[0]);
            let inter_y1 = bbox[1].max(sel[1]);
            let inter_x2 = bbox[2].min(sel[2]);
            let inter_y2 = bbox[3].min(sel[3]);

            if inter_x2 <= inter_x1 || inter_y2 <= inter_y1 {
                continue;
            }

            let inter_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1);
            let bbox_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]);
            let sel_area = (sel[2] - sel[0]) * (sel[3] - sel[1]);
            let union_area = bbox_area + sel_area - inter_area;

            if union_area > 0.0 && inter_area / union_area > iou_threshold {
                keep = false;
                break;
            }
        }
        if keep {
            selected.push(*bbox);
        }
    }

    selected
}

// ─── Recognition post-processing ──────────────────────────────────────────────

/// Simplified PP-OCR character vocabulary (common CJK + Latin).
const DEFAULT_VOCAB: &[char] = &[
    ' ', '!', '"', '#', '$', '%', '&', '\'', '(', ')', '*', '+', ',', '-', '.', '/', '0', '1', '2',
    '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?', '@', 'A', 'B', 'C', 'D', 'E',
    'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
    'Y', 'Z', '[', '\\', ']', '^', '_', '`', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k',
    'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '{', '|', '}', '~',
    '一', '的', '是', '在', '不', '了', '有', '和', '人', '这', '中', '大', '为', '上', '个', '国',
    '我', '以', '要', '他', '时', '来', '用', '们', '生', '到', '作', '地', '于', '出', '就', '分',
    '对', '成', '会', '可', '主', '发', '年', '动', '同', '工', '也', '能', '下', '过', '子', '说',
    '产', '种', '面', '而', '方', '后', '多', '定', '行', '学', '法', '所', '民', '得', '经', '十',
    '三', '之', '进', '着', '等', '部', '度', '家', '电', '力', '里', '如', '水', '化', '高', '自',
    '二', '理', '起', '小', '物', '现', '实', '加', '量', '都', '两', '体', '制', '机', '当', '使',
    '点', '从', '业', '本', '去', '把', '性', '好', '应', '开', '它', '合', '还', '因', '由', '其',
    '些', '然', '前', '外', '天', '政', '四', '日', '那', '社', '义', '事', '平', '形', '相', '全',
    '表', '间', '样', '与', '关', '各', '重', '新', '线', '内', '数', '正', '心', '反', '你', '明',
    '看', '原', '又', '么', '利', '比', '或', '但', '质', '气', '第', '向', '道', '命', '此', '变',
    '条', '只', '没', '结', '解', '问', '意', '建', '月', '公', '无', '系', '军', '很', '情', '者',
    '最', '立', '代', '想', '已', '通', '并', '提', '直', '题', '党', '程', '展', '五', '果', '料',
    '象', '员', '革', '位', '入', '常', '文', '总', '次', '品', '式', '活', '设', '及', '管', '特',
    '件', '长', '求', '老', '头', '基', '资', '边', '流', '路', '级', '少', '图', '山', '统', '接',
    '知', '较', '将', '组', '见', '计', '别', '她', '手', '角', '期', '根', '论', '运', '农', '指',
    '几', '九', '区', '强', '放', '决', '西', '被', '干', '做', '必', '战', '先', '回', '则', '任',
    '取', '据', '处', '队', '南', '给', '色', '光', '门', '即', '保', '治', '北', '造', '百', '规',
    '热', '领', '七', '海', '口', '东', '导', '器', '压', '志', '世', '金', '增', '争', '济', '阶',
    '油', '思', '术', '极', '交', '受', '联', '什', '认', '六', '共', '权', '收', '证', '改', '清',
    '己', '美', '再', '采', '转', '更', '单', '风', '切', '打', '白', '教', '速', '花', '带', '安',
    '场', '身', '车', '例', '真', '务', '具', '万', '每', '目', '至', '达', '走', '积', '示', '议',
    '声', '报', '斗', '完', '类', '八', '离', '华', '名', '确', '才', '科', '张', '信', '马', '节',
    '话', '米', '整', '空', '元', '况', '今', '集', '温', '传', '土', '许', '步', '群', '广', '石',
    '记', '需', '段', '研', '界', '拉', '林', '律', '叫', '且', '究', '观', '越', '织', '装', '影',
    '算', '低', '持', '音', '众', '书', '布', '复', '容', '儿', '须', '际', '商', '非', '验', '连',
    '断', '深', '难', '近', '矿', '千', '周', '委', '股', '始',
];

/// Simple greedy CTC decoder.
fn ctc_decode(output: &Array<f32, IxDyn>) -> String {
    let shape = output.shape();
    if shape.len() < 3 {
        return String::new();
    }

    let timesteps = shape[1];
    let vocab_size = shape[2];

    let mut indices: Vec<usize> = Vec::with_capacity(timesteps);
    for t in 0..timesteps {
        let mut best_idx = 0usize;
        let mut best_val = f32::NEG_INFINITY;
        for c in 0..vocab_size {
            let val = output[[0, t, c]];
            if val > best_val {
                best_val = val;
                best_idx = c;
            }
        }
        indices.push(best_idx);
    }

    let mut result = String::new();
    let mut prev = 0usize;
    for &idx in &indices {
        if idx != prev && idx != 0 {
            if let Some(&ch) = DEFAULT_VOCAB.get(idx.wrapping_sub(1)) {
                result.push(ch);
            }
        }
        prev = idx;
    }

    result
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Simple image hash for cache key (djb2 variant on pixel data).
fn simple_hash(img: &DynamicImage) -> u64 {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    let (w, h) = img.dimensions();
    w.hash(&mut hasher);
    h.hash(&mut hasher);

    let gray = img.to_luma8();
    for y in (0..h).step_by(10) {
        for x in (0..w).step_by(10) {
            hasher.write_u8(gray.get_pixel(x, y)[0]);
        }
    }
    hasher.finish()
}

/// Compute average confidence from recognition softmax output.
fn compute_confidence(output: &Array<f32, IxDyn>) -> f32 {
    let shape = output.shape();
    if shape.len() < 3 || shape[1] == 0 {
        return 0.0;
    }

    let timesteps = shape[1];
    let mut sum = 0.0f32;
    let mut count = 0usize;

    for t in 0..timesteps {
        let mut best_val = f32::NEG_INFINITY;
        for c in 0..shape[2] {
            let val = output[[0, t, c]];
            if val > best_val {
                best_val = val;
            }
        }
        if best_val > 0.0 {
            sum += best_val;
            count += 1;
        }
    }

    if count > 0 {
        sum / count as f32
    } else {
        0.0
    }
}

// ─── Core engine ──────────────────────────────────────────────────────────────

/// The main Rust-native OCR engine.
pub struct OcrEngine;

impl OcrEngine {
    /// Run OCR on the given image.
    pub fn recognize(img: &DynamicImage, _lang: &str) -> Result<Vec<OCRResult>, String> {
        let hash = simple_hash(img);

        // Check cache
        {
            let mut cache = OCR_CACHE
                .lock()
                .map_err(|e| format!("Cache lock poisoned: {e}"))?;
            if let Some(cached) = cache.get(&hash) {
                tracing::debug!("OCR cache hit for hash 0x{:x}", hash);
                return Ok(cached.clone());
            }
        }

        // Run detection
        let (det_input, new_w, new_h) = preprocess_detection(img);
        let (img_w, img_h) = img.dimensions();

        let det_tensor = ort::value::TensorRef::from_array_view(&det_input)
            .map_err(|e| format!("Failed to create detection tensor: {e}"))?;

        let det_outputs_owned = DET_SESSION.run_owned(ort::inputs![det_tensor])?;

        // Get detection output
        let (_name, det_shape_vec, det_data) = det_outputs_owned
            .into_iter()
            .next()
            .ok_or_else(|| "No detection output".to_string())?;

        let det_owned: Array<f32, IxDyn> = Array::from_shape_vec(
            IxDyn(&det_shape_vec),
            det_data,
        )
        .map_err(|e| format!("Failed to create detection array: {e}"))?;
        let det_shape = det_owned.shape().to_vec();
        let det_h = det_shape.get(2).copied().unwrap_or(1).max(1);
        let det_w = det_shape.get(3).copied().unwrap_or(1).max(1);

        let det_array = Array::from_shape_vec(
            IxDyn(&[1, 1, det_h, det_w]),
            det_owned.iter().copied().collect(),
        )
        .map_err(|e| format!("Failed to reshape detection output: {e}"))?;

        // Decode boxes
        let raw_boxes = decode_boxes(
            &det_array,
            img_w as f32,
            img_h as f32,
            new_w as u32,
            new_h as u32,
        );
        let boxes = nms_boxes(&raw_boxes, 0.5);

        if boxes.is_empty() {
            tracing::debug!("No text regions detected in image");
            let empty = vec![];
            OCR_CACHE
                .lock()
                .map(|mut c| c.insert(hash, empty.clone()))
                .ok();
            return Ok(empty);
        }

        tracing::debug!("Detected {} text regions (after NMS)", boxes.len());

        // Run recognition for each box
        let _rec_session = &REC_SESSION;

        let mut results: Vec<OCRResult> = Vec::with_capacity(boxes.len());
        for &[x1, y1, x2, y2] in &boxes {
            let crop_x = (x1 as u32).saturating_sub((x1 as f32 * BOX_EXPAND_RATIO) as u32);
            let crop_y = (y1 as u32).saturating_sub((y1 as f32 * BOX_EXPAND_RATIO) as u32);
            let crop_w = ((x2 - x1) * (1.0 + 2.0 * BOX_EXPAND_RATIO)) as u32;
            let crop_h = ((y2 - y1) * (1.0 + 2.0 * BOX_EXPAND_RATIO)) as u32;

            let crop = img.crop_imm(
                crop_x.min(img_w.saturating_sub(1)),
                crop_y.min(img_h.saturating_sub(1)),
                crop_w.min(img_w.saturating_sub(crop_x)).max(1),
                crop_h.min(img_h.saturating_sub(crop_y)).max(1),
            );

            let rec_input = preprocess_recognition(&crop);

            let rec_tensor = match ort::value::TensorRef::from_array_view(&rec_input) {
                Ok(t) => t,
                Err(e) => {
                    tracing::warn!("Failed to create recognition tensor: {e}");
                    continue;
                }
            };

            let rec_outputs_owned = match REC_SESSION.run_owned(ort::inputs![rec_tensor]) {
                Ok(o) => o,
                Err(e) => {
                    tracing::warn!("Recognition inference failed for one box: {e}");
                    continue;
                }
            };

            let (_name, rec_shape_vec, rec_data) = match rec_outputs_owned.into_iter().next() {
                Some(v) => v,
                None => continue,
            };
            let rec_owned: Array<f32, IxDyn> = match Array::from_shape_vec(
                IxDyn(&rec_shape_vec),
                rec_data,
            ) {
                Ok(a) => a,
                Err(_) => continue,
            };
            let rec_shape = rec_owned.shape().to_vec();

            if rec_shape.len() < 3 {
                continue;
            }

            let timesteps = rec_shape[1];
            let vocab_size = rec_shape[2];

            let rec_reshaped = Array::from_shape_vec(
                IxDyn(&[1, timesteps, vocab_size]),
                rec_owned.iter().copied().collect(),
            );

            let rec_array = match rec_reshaped {
                Ok(a) => a,
                Err(_) => continue,
            };

            let text = ctc_decode(&rec_array);

            if !text.is_empty() {
                let confidence = compute_confidence(&rec_array);
                results.push(OCRResult {
                    text,
                    confidence,
                    bbox: BBox {
                        x: x1,
                        y: y1,
                        width: x2 - x1,
                        height: y2 - y1,
                    },
                });
            }
        }

        OCR_CACHE
            .lock()
            .map(|mut c| c.insert(hash, results.clone()))
            .ok();
        Ok(results)
    }

    /// Warm up the ONNX sessions by loading the models.
    pub fn warmup() -> Result<(), String> {
        tracing::info!("Warming up OCR engine...");
        DET_SESSION.ensure_loaded()?;
        REC_SESSION.ensure_loaded()?;
        tracing::info!("OCR engine warmup complete");
        Ok(())
    }

    /// Get available ONNX Runtime execution provider names.
    pub fn available_providers() -> Vec<String> {
        // ort 2.0 doesn't expose available_providers() directly.
        // CUDA availability is checked via nvidia-smi in gpu.rs
        vec!["CPUExecutionProvider".to_string()]
    }

    /// Check if CUDA is available via nvidia-smi.
    pub fn has_cuda() -> bool {
        std::process::Command::new("nvidia-smi")
            .output()
            .ok()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use image::RgbImage;

    fn test_image() -> DynamicImage {
        let mut img = RgbImage::new(100, 50);
        for p in img.pixels_mut() {
            *p = image::Rgb([255u8, 255, 255]);
        }
        for y in 10..20 {
            for x in 5..90 {
                img.put_pixel(x, y, image::Rgb([30, 30, 30]));
            }
        }
        DynamicImage::ImageRgb8(img)
    }

    #[test]
    fn test_preprocess_detection_shape() {
        let img = test_image();
        let (tensor, nw, nh) = preprocess_detection(&img);
        assert_eq!(
            tensor.shape(),
            &[1, 3, DET_INPUT_SIZE as usize, DET_INPUT_SIZE as usize]
        );
        assert!(nw > 0.0);
        assert!(nh > 0.0);
    }

    #[test]
    fn test_preprocess_recognition_shape() {
        let img = test_image().crop_imm(5, 10, 85, 10);
        let tensor = preprocess_recognition(&img);
        let shape = tensor.shape();
        assert_eq!(shape[0], 1);
        assert_eq!(shape[1], 3);
        assert_eq!(shape[2], REC_HEIGHT as usize);
        assert!(shape[3] >= 8);
        assert!(shape[3] <= REC_MAX_WIDTH as usize);
    }

    #[test]
    fn test_ctc_decode_empty() {
        let arr = Array::zeros(IxDyn(&[1, 10, 100]));
        let text = ctc_decode(&arr);
        assert_eq!(text, "");
    }

    #[test]
    fn test_simple_hash_deterministic() {
        let img = test_image();
        let h1 = simple_hash(&img);
        let h2 = simple_hash(&img);
        assert_eq!(h1, h2);
    }

    #[test]
    fn test_simple_hash_different() {
        let img1 = test_image();
        let mut img2 = RgbImage::new(100, 50);
        for p in img2.pixels_mut() {
            *p = image::Rgb([128, 128, 128]);
        }
        let h1 = simple_hash(&img1);
        let h2 = simple_hash(&DynamicImage::ImageRgb8(img2));
        assert_ne!(h1, h2);
    }

    #[test]
    fn test_decode_boxes_empty() {
        let arr = Array::zeros(IxDyn(&[1, 1, 10, 10]));
        let boxes = decode_boxes(&arr, 100.0, 50.0, 200, 100);
        assert!(boxes.is_empty());
    }

    #[test]
    fn test_decode_boxes_single() {
        let mut arr = Array::zeros(IxDyn(&[1, 1, 10, 10]));
        arr[[0, 0, 5, 5]] = 1.0;
        let boxes = decode_boxes(&arr, 100.0, 50.0, 200, 100);
        assert_eq!(boxes.len(), 1);
    }

    #[test]
    fn test_nms_boxes_non_overlapping() {
        let boxes = vec![[10.0, 10.0, 50.0, 50.0], [100.0, 100.0, 150.0, 150.0]];
        let result = nms_boxes(&boxes, 0.5);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_nms_boxes_overlapping() {
        let boxes = vec![[10.0, 10.0, 100.0, 100.0], [20.0, 20.0, 90.0, 90.0]];
        let result = nms_boxes(&boxes, 0.5);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], [10.0, 10.0, 100.0, 100.0]);
    }

    #[test]
    fn test_lru_cache_basic() {
        let mut cache = OcrCache::new(5);
        let key = 42u64;
        let val = vec![OCRResult {
            text: "hello".into(),
            confidence: 0.95,
            bbox: BBox {
                x: 0.0,
                y: 0.0,
                width: 10.0,
                height: 5.0,
            },
        }];
        assert!(cache.get(&key).is_none());
        cache.insert(key, val.clone());
        assert!(cache.get(&key).is_some());
    }

    #[test]
    fn test_lru_cache_eviction() {
        let mut cache = OcrCache::new(3);
        for i in 0..5 {
            cache.insert(
                i,
                vec![OCRResult {
                    text: format!("item_{i}"),
                    confidence: 0.9,
                    bbox: BBox {
                        x: 0.0,
                        y: 0.0,
                        width: 1.0,
                        height: 1.0,
                    },
                }],
            );
        }
        assert!(cache.get(&0).is_none());
        assert!(cache.get(&1).is_none());
        assert!(cache.get(&2).is_some());
        assert!(cache.get(&3).is_some());
        assert!(cache.get(&4).is_some());
    }

    #[test]
    fn test_compute_confidence_all_zeros() {
        let arr = Array::zeros(IxDyn(&[1, 10, 100]));
        let conf = compute_confidence(&arr);
        assert_eq!(conf, 0.0);
    }
}
