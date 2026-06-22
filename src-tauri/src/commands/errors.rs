//! Unified error message constants for the Tauri command layer.
//!
//! Centralises repeated error strings so call-sites stay terse and
//! every module speaks the same error language.

/// File-system path does not exist.
pub const FILE_NOT_FOUND: &str = "File not found";
/// FFmpeg / ffprobe command failed.
pub const FFMPEG_FAILED: &str = "Failed to run ffmpeg";
/// A Mutex guard was poisoned (another thread panicked while holding it).
pub const SESSION_LOCK_POISONED: &str = "Session lock poisoned";
pub const CACHE_LOCK_POISONED: &str = "Cache lock poisoned";
/// ONNX model file missing from the expected directory.
pub const ONNX_MODEL_NOT_FOUND: &str = "ONNX model not found";
/// Generic ONNX Runtime failure.
pub const ONNX_INFERENCE_FAILED: &str = "ONNX inference failed";
