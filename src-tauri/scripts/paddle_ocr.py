#!/usr/bin/env python3
"""
PaddleOCR wrapper for CaptionFab.

Usage:
    python3 paddle_ocr.py <image_path> <lang>

Output:
    JSON array of OCR results:
    [{"text": "...", "confidence": 0.95, "bbox": {"x": 10, "y": 20, "width": 100, "height": 30}}]
"""

import sys
import json
import os


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: paddle_ocr.py <image_path> <lang>"}))
        sys.exit(1)

    image_path = sys.argv[1]
    lang = sys.argv[2]

    if not os.path.exists(image_path):
        print(json.dumps({"error": f"File not found: {image_path}"}))
        sys.exit(1)

    try:
        from paddleocr import PaddleOCR

        # Map language codes
        lang_map = {
            'ch': 'ch',
            'en': 'en',
            'ja': 'japan',
            'ko': 'korean',
        }
        paddle_lang = lang_map.get(lang, 'ch')

        # Check GPU availability
        use_gpu = False
        gpu_info = {}
        try:
            import paddle
            if paddle.device.is_compiled_with_cuda() and paddle.device.cuda.device_count() > 0:
                use_gpu = True
                gpu_info['available'] = True
                gpu_info['device_count'] = paddle.device.cuda.device_count()
        except Exception:
            pass

        ocr = PaddleOCR(
            use_angle_cls=True,
            lang=paddle_lang,
            show_log=False,
            use_gpu=use_gpu,
        )
        result = ocr.ocr(image_path, cls=True)

        outputs = []
        if result and result[0]:
            for line in result[0]:
                box = line[0]
                text = line[1][0]
                confidence = float(line[1][1])

                # Convert box to bbox format
                x_min = min(p[0] for p in box)
                y_min = min(p[1] for p in box)
                x_max = max(p[0] for p in box)
                y_max = max(p[1] for p in box)

                outputs.append({
                    "text": text,
                    "confidence": confidence,
                    "bbox": {
                        "x": float(x_min),
                        "y": float(y_min),
                        "width": float(x_max - x_min),
                        "height": float(y_max - y_min)
                    }
                })

        # Include GPU info in output
        result_data = {
            'results': outputs,
            'gpu': gpu_info
        }
        print(json.dumps(result_data))

    except ImportError:
        print(json.dumps({"error": "PaddleOCR not installed. Run: pip install paddleocr paddlepaddle"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
