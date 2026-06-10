/**
 * 图像处理内核工具 — 提取自 image.ts 和 image-morph.ts
 * 提供邻域遍历和方形内核生成，供所有图像处理模块共享。
 */

type NeighborCallback = (nx: number, ny: number, srcIdx: number) => void

/**
 * 遍历像素的邻域（方形内核范围内）。
 * 自动处理边界裁剪。
 */
export function forEachNeighbor(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  offsets: [number, number][],
  callback: NeighborCallback,
): void {
  for (const [dx, dy] of offsets) {
    const nx = centerX + dx
    const ny = centerY + dy
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      callback(nx, ny, (ny * width + nx) * 4)
    }
  }
}

/**
 * 生成方形内核的偏移量数组（带缓存）。
 * 内容相同则复用缓存，避免重复分配。
 */
export function getSquareKernel(
  radius: number,
  cache?: Map<number, [number, number][]>,
): [number, number][] {
  if (cache?.has(radius)) {
    return cache.get(radius)!
  }
  const deltas: [number, number][] = []
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      deltas.push([dy, dx])
    }
  }
  cache?.set(radius, deltas)
  return deltas
}
