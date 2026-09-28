/** Serializes writes and drains every edit made while a write is in flight. */
export class SaveQueue<T> {
  private pending?: T;
  private running?: Promise<void>;
  constructor(private readonly write: (value: T) => Promise<void>) {}
  enqueue(value: T) { this.pending = value; }
  flush(): Promise<void> {
    if (this.running) return this.running;
    this.running = (async () => {
      while (this.pending !== undefined) {
        const value = this.pending;
        this.pending = undefined;
        try { await this.write(value); }
        catch (error) { this.pending ??= value; throw error; }
      }
    })().finally(() => { this.running = undefined; });
    return this.running;
  }
}
