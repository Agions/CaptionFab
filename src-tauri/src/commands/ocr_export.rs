//! Inlined OCR + Export commands (thin wrappers eliminated).

use crate::commands::export_fmt::{
    export_as_ass, export_as_csv, export_as_json, export_as_lrc, export_as_sbv, export_as_srt,
    export_as_ssa, export_as_txt, export_as_vtt,
};
use crate::commands::types::{ExportFormat, OCRLang, OCRResult, SubtitleItem};

/// Recognise text in an image using the native Rust OCR engine.
#[tauri::command]
pub async fn ocr_recognize(
    image_path: String,
    lang: String,
    engine: String,
) -> Result<Vec<OCRResult>, String> {
    let path = std::path::Path::new(&image_path);
    if !path.exists() {
        return Err(format!(
            "{}: {}",
            crate::commands::errors::FILE_NOT_FOUND,
            image_path
        ));
    }

    tracing::info!(
        "OCR recognize: {} (lang={}, engine={})",
        image_path,
        lang,
        engine
    );

    match engine.as_str() {
        "paddle" | "native" => ocr_native(&image_path, &lang).await,
        _ => Err(format!("Unknown OCR engine: {}. Supported: native", engine)),
    }
}

async fn ocr_native(image_path: &str, lang: &str) -> Result<Vec<OCRResult>, String> {
    let path = image_path.to_owned();
    let lang = lang.to_owned();

    tokio::task::spawn_blocking(move || {
        let img =
            image::open(&path).map_err(|e| format!("Failed to open image '{}': {}", path, e))?;

        let results = crate::commands::ocr_engine::OcrEngine::recognize(&img, &lang)?;
        Ok(results)
    })
    .await
    .map_err(|e| format!("OCR task panic: {e}"))?
}

/// Return the list of supported OCR languages.
#[tauri::command]
pub async fn ocr_get_languages() -> Vec<OCRLang> {
    vec![
        OCRLang {
            code: "ch".to_string(),
            name: "中文".to_string(),
        },
        OCRLang {
            code: "en".to_string(),
            name: "English".to_string(),
        },
        OCRLang {
            code: "ja".to_string(),
            name: "日本語".to_string(),
        },
        OCRLang {
            code: "ko".to_string(),
            name: "한국어".to_string(),
        },
    ]
}

// ── Export command (inlined from commands/export.rs) ─────────────────────

/// Dispatch to the appropriate format exporter.
fn render_content(subtitles: &[SubtitleItem], format: ExportFormat) -> Result<String, String> {
    match format {
        ExportFormat::SRT => Ok(export_as_srt(subtitles)),
        ExportFormat::WebVTT => Ok(export_as_vtt(subtitles)),
        ExportFormat::ASS => Ok(export_as_ass(subtitles)),
        ExportFormat::SSA => Ok(export_as_ssa(subtitles)),
        ExportFormat::JSON => export_as_json(subtitles),
        ExportFormat::TXT => Ok(export_as_txt(subtitles)),
        ExportFormat::LRC => Ok(export_as_lrc(subtitles)),
        ExportFormat::SBV => Ok(export_as_sbv(subtitles)),
        ExportFormat::CSV => Ok(export_as_csv(subtitles)),
    }
}

/// Export subtitles to a file in the specified format.
#[tauri::command]
pub async fn export_subtitles(
    subtitles: Vec<SubtitleItem>,
    format: ExportFormat,
    output_path: String,
) -> Result<String, String> {
    tracing::info!(
        "Exporting {} subtitles to {:?} at {}",
        subtitles.len(),
        format,
        output_path
    );

    if subtitles.is_empty() {
        return Err("No subtitles to export".to_string());
    }

    let content = render_content(&subtitles, format)?;

    let path = std::path::Path::new(&output_path);
    tokio::fs::write(path, content.as_bytes())
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    tracing::info!("Successfully exported subtitles to {}", output_path);
    Ok(output_path)
}
