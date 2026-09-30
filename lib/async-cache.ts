// Bounded LRU cache. Rejected computations are never retained; callers own copies.
export class AsyncCache<T> {
  private entries = new Map<string, { promise: Promise<T>; weight: number }>();
  private weight = 0;

  constructor(private maxEntries: number, private maxWeight: number) {}

  async get(key: string, compute: () => Promise<T>): Promise<T> {
    let entry = this.entries.get(key);
    if (entry) {
      this.entries.delete(key);
      this.entries.set(key, entry);
    } else {
      const promise = Promise.resolve().then(compute);
      entry = { promise, weight: key.length };
      if (entry.weight <= this.maxWeight) {
        this.entries.set(key, entry);
        this.weight += entry.weight;
        while (this.entries.size > this.maxEntries || this.weight > this.maxWeight) {
          const oldest = this.entries.keys().next().value!;
          this.weight -= this.entries.get(oldest)!.weight;
          this.entries.delete(oldest);
        }
      }
      const current = entry;
      void promise.catch(() => {
        if (this.entries.get(key) === current) {
          this.entries.delete(key);
          this.weight -= current.weight;
        }
      });
    }
    return structuredClone(await entry.promise);
  }
}
