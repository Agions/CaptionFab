#!/usr/bin/env bash
# ==============================================================================
# Download PaddleOCR PP-OCRv6 ONNX models for CaptionFab.
#
# Usage:
#   bash download-models.sh          # Download PP-OCRv6 models (recommended)
#   bash download-models.sh --v4     # Download PP-OCRv4 models (fallback)
#
# The script first checks if ONNX models exist locally, then downloads
# pre-converted ONNX models from HuggingFace/releases, or falls back to
# downloading Paddle inference models + converting via paddle2onnx.
# ==============================================================================

set -euo pipefail

MODELS_DIR="$(cd "$(dirname "$0")/../models" && pwd)"
mkdir -p "$MODELS_DIR"

echo "📁 Models directory: $MODELS_DIR"

# ─── File paths ───────────────────────────────────────────────────────────────
DET_ONNX="$MODELS_DIR/det.onnx"
REC_ONNX="$MODELS_DIR/rec.onnx"
CLS_ONNX="$MODELS_DIR/cls.onnx"

# ─── Check if already downloaded ──────────────────────────────────────────────
if [ -f "$DET_ONNX" ] && [ -f "$REC_ONNX" ]; then
    DET_SIZE=$(stat -c%s "$DET_ONNX" 2>/dev/null || stat -f%z "$DET_ONNX" 2>/dev/null)
    REC_SIZE=$(stat -c%s "$REC_ONNX" 2>/dev/null || stat -f%z "$REC_ONNX" 2>/dev/null)
    echo "✅ Models already exist: det.onnx ($((DET_SIZE/1024/1024))MB), rec.onnx ($((REC_SIZE/1024/1024))MB)"
    exit 0
fi

# ─── Try direct ONNX download first (fastest path) ───────────────────────────
echo "🔍 Searching for pre-converted ONNX models..."

# Ubuntu Paste / GitHub Gist with model URLs (fallback)
# These URLs point to the PP-OCRv6 ONNX models hosted on HuggingFace
USEC_V4=false
for arg in "$@"; do
    if [ "$arg" = "--v4" ]; then USEC_V4=true; fi
done

if [ "$USEC_V4" = true ]; then
    # PP-OCRv4 models (smaller, slightly lower accuracy)
    echo "📥 Downloading PP-OCRv4 ONNX models..."
    DET_URL="https://huggingface.co/PaddlePaddle/PP-OCRv4/resolve/main/det.onnx"
    REC_URL="https://huggingface.co/PaddlePaddle/PP-OCRv4/resolve/main/rec.onnx"
else
    # PP-OCRv6 models (default, latest)
    echo "📥 Downloading PP-OCRv6 ONNX models..."
    DET_URL="https://huggingface.co/PaddlePaddle/PP-OCRv6/resolve/main/det.onnx"
    REC_URL="https://huggingface.co/PaddlePaddle/PP-OCRv6/resolve/main/rec.onnx"
fi

download_model() {
    local url="$1"
    local output="$2"
    local name="$3"

    echo "  ⬇️  Downloading $name..."

    if command -v curl &>/dev/null; then
        if curl -fL --progress-bar -o "$output" "$url" 2>&1; then
            return 0
        fi
    elif command -v wget &>/dev/null; then
        if wget -q --show-progress -O "$output" "$url" 2>&1; then
            return 0
        fi
    else
        echo "  ❌ Neither curl nor wget found. Please install one."
        return 1
    fi

    echo "  ⚠️  Direct download failed: $name"
    return 1
}

DL_OK=true
download_model "$DET_URL" "$DET_ONNX" "det.onnx" || DL_OK=false
download_model "$REC_URL" "$REC_ONNX" "rec.onnx" || DL_OK=false

if [ "$DL_OK" = true ]; then
    echo "✅ ONNX models downloaded successfully!"
    ls -lh "$MODELS_DIR"/
    exit 0
fi

# ─── Fallback: Convert from Paddle inference models via paddle2onnx ──────────
echo ""
echo "⚙️  Direct ONNX download failed. Attempting Paddle→ONNX conversion..."
echo "   This requires PaddlePaddle + paddle2onnx installed."
echo "   Install: pip install paddlex && paddlex --install paddle2onnx"
echo ""

# Check if paddle2onnx is available
if command -v paddle2onnx &>/dev/null || python3 -c "import paddle2onnx" 2>/dev/null; then
    echo "✅ paddle2onnx found. Converting Paddle models to ONNX..."

    # Download Paddle inference models
    PADDLE_DIR="$MODELS_DIR/paddle"
    mkdir -p "$PADDLE_DIR"

    if [ "$USEC_V4" = true ]; then
        echo "📥 Downloading PP-OCRv4 Paddle inference models..."
        # PP-OCRv4 detection model
        wget -q --show-progress \
            -O "$PADDLE_DIR/det.pdmodel" \
            "https://paddleocr.bj.bcebos.com/PP-OCRv4/ch/ch_PP-OCRv4_det_infer.tar" 2>/dev/null || {
            # Try alternative source
            echo "⚠️  Download failed. Please manually download from:"
            echo "   https://github.com/PaddlePaddle/PaddleOCR/blob/main/doc/doc_en/models_list_en.md"
            exit 1
        }
    else
        echo "📥 Downloading PP-OCRv6 Paddle inference models..."
        # PP-OCRv6 models from HuggingFace (Paddle format)
        HF_BASE="https://huggingface.co/PaddlePaddle/PP-OCRv6/resolve/main"
        wget -q --show-progress -O "$PADDLE_DIR/det.pdmodel" "$HF_BASE/det.pdmodel" 2>/dev/null || true
        wget -q --show-progress -O "$PADDLE_DIR/rec.pdmodel" "$HF_BASE/rec.pdmodel" 2>/dev/null || true

        # Validate downloads
        if [ ! -f "$PADDLE_DIR/det.pdmodel" ] || [ ! -f "$PADDLE_DIR/rec.pdmodel" ]; then
            echo "⚠️  Paddle model downloads failed. Alternative sources:"
            echo "   https://huggingface.co/collections/PaddlePaddle/pp-ocrv6"
            exit 1
        fi
    fi

    # Convert to ONNX
    echo "🔄 Converting Paddle models to ONNX (this may take a minute)..."
    python3 -m paddle2onnx \
        --model_dir "$PADDLE_DIR" \
        --model_filename det.pdmodel \
        --params_filename det.pdiparams \
        --save_file "$DET_ONNX" \
        --opset_version 11 \
        --input_shape_dict "{'x': [1, 3, 960, 960]}"

    python3 -m paddle2onnx \
        --model_dir "$PADDLE_DIR" \
        --model_filename rec.pdmodel \
        --params_filename rec.pdiparams \
        --save_file "$REC_ONNX" \
        --opset_version 11

    # Clean up Paddle models
    rm -rf "$PADDLE_DIR"

    echo "✅ ONNX models created successfully!"
    ls -lh "$MODELS_DIR"/
else
    echo ""
    echo "⚠️  paddle2onnx not available. You need to manually obtain the ONNX models."
    echo ""
    echo "   Option 1: Install paddle2onnx and re-run this script"
    echo "     pip install paddlex paddlepaddle"
    echo "     paddlex --install paddle2onnx"
    echo "     bash $0"
    echo ""
    echo "   Option 2: Download PP-OCRv6 ONNX models manually from:"
    echo "     https://huggingface.co/collections/PaddlePaddle/pp-ocrv6"
    echo "     Place 'det.onnx' and 'rec.onnx' in: $MODELS_DIR"
    echo ""
    echo "   Option 3: Use PP-OCRv4 with direct download (smaller, faster):"
    echo "     bash $0 --v4"
    echo ""
    exit 1
fi
