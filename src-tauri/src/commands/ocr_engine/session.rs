//! ONNX session management — lazy loading + Mutex-guarded inference.

use std::path::PathBuf;
use std::sync::LazyLock;
use std::sync::Mutex;

use ort::session::Session;

// ─── Model path resolution ───────────────────────────────────────────────────

/// Resolve the model directory.
pub fn model_dir() -> PathBuf {
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

pub fn model_path(name: &str) -> PathBuf {
    let mut p = model_dir();
    p.push(name);
    p
}

// ─── Session wrapper ─────────────────────────────────────────────────────────

/// Wrapper around an `ort::session::Session` that loads lazily.
/// Session::run() takes &mut self, so we keep it inside the Mutex.
pub struct OcrSession {
    pub path: PathBuf,
    pub session: Mutex<Option<Session>>,
}

impl OcrSession {
    pub fn new(name: &str) -> Self {
        Self {
            path: model_path(name),
            session: Mutex::new(None),
        }
    }

    pub fn ensure_loaded(&self) -> Result<(), String> {
        let mut guard = self
            .session
            .lock()
            .map_err(|e| format!("{}: {e}", crate::commands::errors::SESSION_LOCK_POISONED))?;
        if guard.is_some() {
            return Ok(());
        }

        tracing::info!("Loading ONNX model: {}", self.path.display());
        if !self.path.exists() {
            return Err(format!(
                "{}: {}. Run `scripts/download-models.sh` to download.",
                crate::commands::errors::ONNX_MODEL_NOT_FOUND,
                self.path.display()
            ));
        }

        let session = Session::builder()
            .map_err(|e| format!("Failed to create ONNX session builder: {e}"))?
            .commit_from_file(&self.path)
            .map_err(|e| format!("Failed to load ONNX model '{}': {e}", self.path.display()))?;

        let inputs = session.inputs();
        let outputs = session.outputs();
        tracing::info!(
            "ONNX model loaded: {} (inputs={}, outputs={})",
            self.path.display(),
            inputs.len(),
            outputs.len()
        );

        *guard = Some(session);
        Ok(())
    }
}

// Type alias for ONNX output tensor metadata
type OutputTensor = (String, Vec<usize>, Vec<f32>);

impl OcrSession {
    /// Run inference and return owned output tensors.
    /// Each output is a tuple of (name, shape, data).
    pub fn run_owned<'i, 'v: 'i, const N: usize>(
        &self,
        input_values: impl Into<ort::session::SessionInputs<'i, 'v, N>>,
    ) -> Result<Vec<OutputTensor>, String> {
        self.ensure_loaded()?;
        let mut guard = self
            .session
            .lock()
            .map_err(|e| format!("{}: {e}", crate::commands::errors::SESSION_LOCK_POISONED))?;
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
                .map_err(|e| format!("{}: {e}", crate::commands::errors::ONNX_INFERENCE_FAILED))?;

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

// ─── Session singletons ───────────────────────────────────────────────────────

pub static DET_SESSION: LazyLock<OcrSession> = LazyLock::new(|| OcrSession::new("det.onnx"));
pub static REC_SESSION: LazyLock<OcrSession> = LazyLock::new(|| OcrSession::new("rec.onnx"));
