/**
 * 泛型 LRU（最近最少使用）缓存
 * 提取自 Pipeline.ts 的 SimilarityCache 和 _trimMemo，消除重复缓存逻辑。
 * 基于 Map 的插入序实现 O(1) 查找 + 批量淘汰。
 */

export class LRUCache<K, V> {
  private _map = new Map<K, V>()
  private readonly _maxSize: number
  private readonly _trimTarget: number

  /**
   * @param maxSize 触发淘汰的阈值
   * @param trimTarget 淘汰后保留的数量（默认 = maxSize * 0.75）
   */
  constructor(maxSize: number, trimTarget?: number) {
    this._maxSize = maxSize
    this._trimTarget = trimTarget ?? Math.floor(maxSize * 0.75)
  }

  get(key: K): V | undefined {
    return this._map.get(key)
  }

  set(key: K, value: V): void {
    if (this._map.size >= this._maxSize) {
      // 批量淘汰最旧的条目（Map 保持插入顺序）
      const keys = [...this._map.keys()]
      const deleteCount = keys.length - this._trimTarget
      for (let i = 0; i < deleteCount; i++) {
        this._map.delete(keys[i])
      }
    }
    this._map.set(key, value)
  }

  has(key: K): boolean {
    return this._map.has(key)
  }

  get size(): number {
    return this._map.size
  }

  clear(): void {
    this._map.clear()
  }
}
