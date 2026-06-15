/** Simple LRU cache for lazy-resolved bulk import forms. */
export class LruCache<K, V> {
  private readonly maxSize: number
  private readonly map = new Map<K, V>()

  constructor (maxSize: number) {
    this.maxSize = Math.max(1, maxSize)
  }

  get (key: K): V | undefined {
    const value = this.map.get(key)
    if (value === undefined) return undefined
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set (key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key)
    this.map.set(key, value)
    while (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value
      if (oldest === undefined) break
      this.map.delete(oldest)
    }
  }

  has (key: K): boolean {
    return this.map.has(key)
  }

  delete (key: K): void {
    this.map.delete(key)
  }

  clear (): void {
    this.map.clear()
  }
}
