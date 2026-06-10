import { describe, it, expect } from 'vitest'
import { LRUCache } from './lru-cache'

describe('LRUCache', () => {
  it('creates a cache with given maxSize', () => {
    const cache = new LRUCache<string, number>(3)
    expect(cache.size).toBe(0)
  })

  it('set and get basic values', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBe(2)
  })

  it('returns undefined for missing keys', () => {
    const cache = new LRUCache<string, number>(3)
    expect(cache.get('missing')).toBeUndefined()
  })

  it('has() returns true for existing and false for missing keys', () => {
    const cache = new LRUCache<string, number>(5)
    cache.set('x', 10)
    expect(cache.has('x')).toBe(true)
    expect(cache.has('y')).toBe(false)
  })

  it('overwrites existing key values', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('a', 2)
    expect(cache.get('a')).toBe(2)
    expect(cache.size).toBe(1)
  })

  it('size tracks the number of entries', () => {
    const cache = new LRUCache<number, string>(5)
    expect(cache.size).toBe(0)
    cache.set(1, 'one')
    expect(cache.size).toBe(1)
    cache.set(2, 'two')
    expect(cache.size).toBe(2)
    cache.set(1, 'uno') // overwrite
    expect(cache.size).toBe(2)
  })

  it('evicts oldest entries when capacity is reached', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    // Cache is full (3 items), next insert should trigger eviction
    cache.set('d', 4)
    expect(cache.size).toBe(3)
    // 'a' is oldest, should be evicted
    expect(cache.has('a')).toBe(false)
    expect(cache.has('b')).toBe(true)
    expect(cache.has('c')).toBe(true)
    expect(cache.has('d')).toBe(true)
  })

  it('evicts multiple entries in batch when needed', () => {
    const cache = new LRUCache<string, number>(4)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    cache.set('d', 4)
    // maxSize=4, trimTarget=floor(4*0.75)=3. So inserting 5th evicts 1.
    cache.set('e', 5)
    expect(cache.size).toBe(4)
    expect(cache.has('a')).toBe(false) // oldest evicted
    expect(cache.has('e')).toBe(true)
  })

  it('respects custom trimTarget', () => {
    // maxSize=10, trimTarget=2 — aggressive eviction
    const cache = new LRUCache<number, string>(10, 2)
    for (let i = 0; i < 10; i++) {
      cache.set(i, `v${i}`)
    }
    expect(cache.size).toBe(10)
    // 11th insert: deleteCount = 10 - 2 = 8, then add 1 → size = 3
    cache.set(10, 'v10')
    expect(cache.size).toBe(3)
    expect(cache.has(10)).toBe(true)
    expect(cache.has(9)).toBe(true)
    // oldest should be gone
    expect(cache.has(0)).toBe(false)
    expect(cache.has(5)).toBe(false)
  })

  it('clear() empties the cache', () => {
    const cache = new LRUCache<number, string>(5)
    cache.set(1, 'a')
    cache.set(2, 'b')
    cache.set(3, 'c')
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.has(1)).toBe(false)
    expect(cache.get(2)).toBeUndefined()
  })

  it('handles capacity of 1', () => {
    const cache = new LRUCache<string, number>(1)
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
    expect(cache.size).toBe(1)
    cache.set('b', 2) // evicts 'a'
    expect(cache.has('a')).toBe(false)
    expect(cache.get('b')).toBe(2)
    expect(cache.size).toBe(1)
  })

  it('works with non-string keys (number keys)', () => {
    const cache = new LRUCache<number, boolean>(3)
    cache.set(42, true)
    cache.set(99, false)
    expect(cache.get(42)).toBe(true)
    expect(cache.get(99)).toBe(false)
  })

  it('works with object values', () => {
    const cache = new LRUCache<string, { x: number }>(3)
    const obj = { x: 1 }
    cache.set('key', obj)
    expect(cache.get('key')).toBe(obj)
  })

  it('trimTarget defaults to floor(maxSize * 0.75)', () => {
    // With maxSize=5, trimTarget=3; evicts 2 items each time
    const cache = new LRUCache<string, number>(5)
    for (let i = 0; i < 5; i++) cache.set(`k${i}`, i)
    cache.set('extra', 99)
    expect(cache.size).toBe(4) // 5 - (5-3) + 1 = 4
    // First two entries ('k0', 'k1') should be evicted
    expect(cache.has('k0')).toBe(false)
    expect(cache.has('k1')).toBe(false)
    expect(cache.has('k2')).toBe(true)
  })
})
