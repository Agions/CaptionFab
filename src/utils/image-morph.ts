/**
 * 形态学操作 — 提取自 image.ts
 * 职责：腐蚀、膨胀、开运算（erode + dilate）
 *
 * 优化思路：独立模块后，image.ts 聚焦于核心像素操作和缩放，
 * 形态学操作可按需引入（tree-shaking 友好）。
 */

import { forEachNeighbor, getSquareKernel } from './image-kernel'

// ─── 通用形态学操作 ──────────────────────────────────────────────

function morphologicalOp(
  imageData: ImageData,
  size: number,
  accumulate: (current: number, neighbor: number) => number,
  initial: number,
): ImageData {
  const { data, width, height } = imageData
  const result = new ImageData(width, height)
  const kernel = getSquareKernel(size)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = initial
      forEachNeighbor(x, y, width, height, kernel, (_nx, _ny, idx) => {
        acc = accumulate(acc, data[idx])
      })
      const ri = (y * width + x) * 4
      result.data[ri] = acc
      result.data[ri + 1] = acc
      result.data[ri + 2] = acc
      result.data[ri + 3] = 255
    }
  }
  return result
}

/** 形态学腐蚀：取邻域最小值（收缩白色区域） */
export function morphologicalErode(imageData: ImageData, size: number): ImageData {
  return morphologicalOp(imageData, size, Math.min, 255)
}

/** 形态学膨胀：取邻域最大值（扩展白色区域） */
export function morphologicalDilate(imageData: ImageData, size: number): ImageData {
  return morphologicalOp(imageData, size, Math.max, 0)
}

/** 开运算：先腐蚀后膨胀（去除小噪点，保留大结构） */
export function morphOpen(imageData: ImageData, size: number = 1): ImageData {
  const eroded = morphologicalErode(imageData, size)
  return morphologicalDilate(eroded, size)
}
