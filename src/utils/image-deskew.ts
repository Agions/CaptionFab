/**
 * 图像旋转与文字倾斜矫正 — 提取自 image.ts
 * 职责：检测文本倾斜角度 + 旋转矫正
 */

export interface DeskewResult {
  angle: number
  corrected: ImageData
}

// ─── 投影方差评估（内部辅助）─────────────────────────────────────
function evaluateProjectionFast(
  binary: Uint8Array, width: number, height: number,
  cosVal: number, sinVal: number,
): number {
  const projections: number[] = new Array(height).fill(0)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width
    for (let x = 0; x < width; x++) {
      if (binary[rowOffset + x]) {
        const ry = Math.round(x * sinVal + y * cosVal)
        if (ry >= 0 && ry < height) {
          projections[ry]++
        }
      }
    }
  }

  const mean = projections.reduce((a, b) => a + b, 0) / height
  let totalVariance = 0
  for (const p of projections) {
    totalVariance += (p - mean) ** 2
  }
  return -totalVariance
}

/**
 * 检测图像中文字的倾斜角度（±15° 范围，1° 步进）。
 * 使用投影方差法：水平对齐时投影方差最小。
 */
export function detectSkewAngle(imageData: ImageData): number {
  const { data, width, height } = imageData

  // 二值化
  const binary = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      binary[y * width + x] = data[idx] < 128 ? 1 : 0
    }
  }

  // 预计算 cos/sin 查找表
  const angleSteps = 31
  const angleMin = -15
  const cosTable = new Float32Array(angleSteps)
  const sinTable = new Float32Array(angleSteps)
  for (let i = 0; i < angleSteps; i++) {
    const radians = (angleMin + i) * Math.PI / 180
    cosTable[i] = Math.cos(radians)
    sinTable[i] = Math.sin(radians)
  }

  let bestAngle = 0
  let bestScore = -Infinity

  for (let i = 0; i < angleSteps; i++) {
    const score = evaluateProjectionFast(binary, width, height, cosTable[i], sinTable[i])
    if (score > bestScore) {
      bestScore = score
      bestAngle = angleMin + i
    }
  }

  return bestAngle
}

/**
 * 按指定角度旋转图像。
 * 角度 < 0.5° 时直接返回原图（避免无意义计算）。
 */
export function rotateImage(imageData: ImageData, angle: number): ImageData {
  if (Math.abs(angle) < 0.5) return imageData

  const { data, width, height } = imageData
  const radians = angle * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  const newWidth = Math.round(Math.abs(width * cos) + Math.abs(height * sin)) + 2
  const newHeight = Math.round(Math.abs(height * cos) + Math.abs(width * sin)) + 2

  const result = new ImageData(newWidth, newHeight)
  const cx = width / 2
  const cy = height / 2
  const newCx = newWidth / 2
  const newCy = newHeight / 2

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const dx = x - newCx
      const dy = y - newCy
      const srcX = Math.round(dx * cos + dy * sin + cx)
      const srcY = Math.round(-dx * sin + dy * cos + cy)

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * 4
        const dstIdx = (y * newWidth + x) * 4
        result.data[dstIdx] = data[srcIdx]
        result.data[dstIdx + 1] = data[srcIdx + 1]
        result.data[dstIdx + 2] = data[srcIdx + 2]
        result.data[dstIdx + 3] = data[srcIdx + 3] || 255
      }
    }
  }

  return result
}

/** 检测倾斜角度并自动矫正（组合操作） */
export function applyDeskew(imageData: ImageData): DeskewResult {
  const angle = detectSkewAngle(imageData)
  const corrected = rotateImage(imageData, angle)
  return { angle, corrected }
}
