#!/usr/bin/env python3
"""
DEPRECATED — OCR functionality has been moved to Rust (ocr_engine.rs).

This file is kept for reference only. The Rust-native engine uses ONNX Runtime
with PaddleOCR PP-OCRv6 models directly via the `ort` crate.

To run the new engine, the app no longer requires Python or PaddleOCR.
See `src-tauri/src/commands/ocr_engine.rs` for the implementation.

To remove this file: simply delete it. It is no longer referenced.
"""
import sys
print('{"results": [], "gpu": {}, "warning": "DEPRECATED: Use Rust-native OCR engine instead"}')
sys.exit(0)