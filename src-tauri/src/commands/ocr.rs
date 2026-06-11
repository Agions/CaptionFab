//! OCR recognition module.
//!
//! Provides OCR capabilities via PaddleOCR (Python script).
//!
//! ## Architecture
//!
//! ```text
//! Image File -> paddle_ocr.py -> PaddleOCR -> OCRResult[]
//! ```
//!
//! ## Supported Engines
//!
//! | Engine | Language | Purpose |
//! |--------|----------|---------| 
//! | PaddleOCR | Python | High-accuracy Chinese OCR |

use serde::{Deserialize, Serialize};
use std::path::Path;

use super::utils::{find_python_binary, find_script};

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

/// Response from the Python OCR script, includes results and GPU info.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct OCRResponse {
    results: Vec<OCRResult>,
    #[allow(dead_code)]
    gpu: serde_json::Value,
}

#[tauri::command]
pub async fn ocr_recognize(
    image_path: String,
    lang: String,
    engine: String,
) -> Result<Vec<OCRResult>, String> {
    let path = Path::new(&image_path);
    if !path.exists() {
        return Err(format!("File not found: {}", image_path));
    }

    tracing::info!("OCR recognize: {} (lang={}, engine={})", image_path, lang, engine);

    match engine.as_str() {
        "paddle" => ocr_paddle(&image_path, &lang).await,
        _ => Err(format!("Unknown OCR engine: {}. Supported: paddle", engine)),
    }
}

async fn ocr_paddle(image_path: &str, lang: &str) -> Result<Vec<OCRResult>, String> {
    let python = find_python_binary().await?;
    let script = find_script("paddle_ocr.py")?;

    let script_path = script.to_str().ok_or_else(|| {
        format!("paddle_ocr.py path is not valid UTF-8: {:?}", script)
    })?;

    let output = tokio::process::Command::new(&python)
        .args([script_path, image_path, lang])
        .output()
        .await
        .map_err(|e| format!("Failed to run paddle_ocr.py: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("paddle_ocr.py failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    
    // Try to parse as new format (with results and gpu fields)
    let results = if let Ok(response) = serde_json::from_str::<OCRResponse>(&stdout) {
        tracing::info!(
            "PaddleOCR returned {} results (GPU: {:?})", 
            response.results.len(), 
            response.gpu
        );
        response.results
    } else {
        // Fallback: try to parse as old format (plain array)
        let results: Vec<OCRResult> = serde_json::from_str(&stdout)
            .map_err(|e| format!("Failed to parse OCR output: {}\nOutput: {}", e, stdout))?;
        tracing::info!("PaddleOCR returned {} results", results.len());
        results
    };

    Ok(results)
}

#[tauri::command]
pub async fn ocr_get_languages() -> Vec<OCRLang> {
    vec![
        OCRLang { code: "ch".to_string(), name: "中文".to_string() },
        OCRLang { code: "en".to_string(), name: "English".to_string() },
        OCRLang { code: "ja".to_string(), name: "日本語".to_string() },
        OCRLang { code: "ko".to_string(), name: "한국어".to_string() },
    ]
}
