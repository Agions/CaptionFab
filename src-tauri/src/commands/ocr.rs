//! OCR recognition module — pure Rust ONNX inference engine.
//!
//! Replaces the Python PaddleOCR subprocess with a Rust-native pipeline
//! using the `ort` crate and PaddleOCR PP-OCRv6 ONNX models.
//!
//! ## Architecture
//!
//! ```text
//! Image File → image::open → DynamicImage → ocr_engine::OcrEngine::recognize → OCRResult[]
//! ```
//!
//! ## Performance
//!
//! - **LRU Cache**: Frame hash → OCR result, configurable capacity (default 256)
//! - **Model Warmup**: Call `OcrEngine::warmup()` on app startup
//! - **GPU**: Automatic CUDA/CPU provider selection via ONNX Runtime

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRResult {
    pub text: String,
    pub confidence: f32,
    pub bbox: BBox,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BBox {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRLang {
    pub code: String,
    pub name: String,
}

/// Recognise text in an image using the native Rust OCR engine.
///
/// Loads the image, runs it through the ONNX-based OCR pipeline,
/// and returns detected text regions with bounding boxes.
#[tauri::command]
pub async fn ocr_recognize(
    image_path: String,
    lang: String,
    engine: String,
) -> Result<Vec<OCRResult>, String> {
    let path = std::path::Path::new(&image_path);
    if !path.exists() {
        return Err(format!("File not found: {}", image_path));
    }

    tracing::info!("OCR recognize: {} (lang={}, engine={})", image_path, lang, engine);

    match engine.as_str() {
        "paddle" | "native" => ocr_native(&image_path, &lang).await,
        _ => Err(format!("Unknown OCR engine: {}. Supported: native", engine)),
    }
}

async fn ocr_native(image_path: &str, lang: &str) -> Result<Vec<OCRResult>, String> {
    // Load image in a blocking task (image I/O + OCR inference are CPU-bound)
    let path = image_path.to_owned();
    let lang = lang.to_owned();

    tokio::task::spawn_blocking(move || {
        let img = image::open(&path)
            .map_err(|e| format!("Failed to open image '{}': {}", path, e))?;

        let results = super::ocr_engine::OcrEngine::recognize(&img, &lang)?;
        Ok(results)
    })
    .await
    .map_err(|e| format!("OCR task panic: {e}"))?
}

/// Return the list of supported OCR languages.
#[tauri::command]
pub async fn ocr_get_languages() -> Vec<OCRLang> {
    vec![
        OCRLang { code: "ch".to_string(), name: "中文".to_string() },
        OCRLang { code: "en".to_string(), name: "English".to_string() },
        OCRLang { code: "ja".to_string(), name: "日本語".to_string() },
        OCRLang { code: "ko".to_string(), name: "한국어".to_string() },
    ]
}
