/**
 * A minimal concurrency gate.
 *
 * The grocery listener fires jobs with `void run(...)` and no cap, which is harmless when lists
 * arrive one at a time. A 15-photo import batch arrives all at once, and uncapped that would put
 * fifteen parse pipelines on a 4-vCPU box simultaneously. Three in parallel were measured clean
 * against OpenRouter (no 429s, no throttling); ordering doesn't matter, total throughput does.
 *
 * Kept pure and separate so it can be tested without Firestore or a network.
 */
export function createLimiter(maxConcurrent: number) {
  if (maxConcurrent < 1)
    throw new Error(`[concurrency] maxConcurrent must be >= 1`);

  let active = 0;
  const waiting: Array<() => void> = [];

  // The finished job hands its slot straight to the next waiter rather than decrementing and
  // letting it re-acquire: a waiter only resumes on a later microtask, and a `run()` arriving in
  // between would see a free slot and take it too, putting maxConcurrent + 1 jobs in flight.
  const release = () => {
    const next = waiting.shift();
    if (next) next();
    else active--;
  };

  return {
    /** Runs `task` once a slot is free. Rejects exactly as `task` does; the slot is freed either
     * way, so one throwing job can never wedge the queue. */
    async run<T>(task: () => Promise<T>): Promise<T> {
      if (active >= maxConcurrent) {
        await new Promise<void>((resolve) => waiting.push(resolve));
      } else {
        active++;
      }
      try {
        return await task();
      } finally {
        release();
      }
    },
    /** For logging: how many are running and how many are queued behind them. */
    stats() {
      return { active, queued: waiting.length };
    },
  };
}
