//! GPU capability detection for CaptionFab.
//!
//! Checks CUDA availability and GPU memory via PaddlePaddle and pynvml.

use serde::{Deserialize, Serialize};
use super::utils::find_python_binary;

/// GPU capability information returned from the Python backend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GPUCapability {
    /// Whether CUDA GPU is available
    pub available: bool,
    /// Number of GPU devices
    pub device_count: Option<u32>,
    /// Total GPU memory in bytes
    pub memory_total: Option<u64>,
    /// CUDA version string
    pub cuda_version: Option<String>,
}

/// Check GPU capability by querying PaddlePaddle's CUDA support.
///
/// Returns a `GPUCapability` struct with GPU availability, device count,
/// and memory information.
#[tauri::command]
pub async fn check_gpu_capability() -> GPUCapability {
    let python = match find_python_binary().await {
        Ok(p) => p,
        Err(_) => return GPUCapability {
            available: false,
            device_count: None,
            memory_total: None,
            cuda_version: None,
        },
    };

    let script = r#"
import sys
try:
    import paddle
    import json
    available = paddle.device.is_compiled_with_cuda() and paddle.device.cuda.device_count() > 0
    result = {
        "available": available,
        "device_count": paddle.device.cuda.device_count() if available else 0,
        "memory_total": None,
        "cuda_version": str(paddle.device.cuda.device_count()) if available else None
    }
    if available:
        try:
            import pynvml
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            result["memory_total"] = info.total
            result["device_name"] = pynvml.nvmlDeviceGetName(handle)
        except Exception:
            pass
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"available": False, "error": str(e)}))
"#;

    let output = tokio::process::Command::new(&python)
        .args(["-c", script])
        .output()
        .await;

    match output {
        Ok(out) if out.status.success() => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            serde_json::from_str(&stdout).unwrap_or(GPUCapability {
                available: false,
                device_count: None,
                memory_total: None,
                cuda_version: None,
            })
        }
        _ => GPUCapability {
            available: false,
            device_count: None,
            memory_total: None,
            cuda_version: None,
        },
    }
}
