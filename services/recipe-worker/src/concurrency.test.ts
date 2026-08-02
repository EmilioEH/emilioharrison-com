import { describe, it, expect } from 'vitest'
import { createLimiter } from './concurrency'

/** A task that resolves only when the test says so, while reporting when it started. */
function deferred() {
  let release!: () => void
  const done = new Promise<void>((resolve) => {
    release = resolve
  })
  return { done, release }
}

describe('createLimiter', () => {
  it('runs no more than the cap at once and queues the rest', async () => {
    const limiter = createLimiter(3)
    const gates = Array.from({ length: 5 }, deferred)
    let started = 0

    const runs = gates.map((gate) =>
      limiter.run(async () => {
        started++
        await gate.done
      }),
    )

    // Four ticks is plenty for anything unblocked to have started.
    await Promise.resolve()
    expect(started).toBe(3)
    expect(limiter.stats()).toEqual({ active: 3, queued: 2 })

    gates[0].release()
    await runs[0]
    await Promise.resolve()
    expect(started).toBe(4)

    gates.forEach((g) => g.release())
    await Promise.all(runs)
    expect(started).toBe(5)
    expect(limiter.stats()).toEqual({ active: 0, queued: 0 })
  })

  it('frees the slot when a task throws, so one bad job cannot wedge the queue', async () => {
    const limiter = createLimiter(1)

    await expect(
      limiter.run(async () => {
        throw new Error('parse failed')
      }),
    ).rejects.toThrow('parse failed')

    expect(limiter.stats()).toEqual({ active: 0, queued: 0 })
    await expect(limiter.run(async () => 'next job ran')).resolves.toBe('next job ran')
  })

  it('never exceeds the cap when a slot is freed and claimed in the same tick', async () => {
    // The subtle one: if a finishing task decremented the counter instead of handing its slot
    // straight to a waiter, a run() arriving before the waiter resumed would see a free slot and
    // take it too — four pipelines in flight under a cap of three.
    const limiter = createLimiter(2)
    const gates = Array.from({ length: 4 }, deferred)
    let active = 0
    let peak = 0

    const runs = gates.map((gate) =>
      limiter.run(async () => {
        active++
        peak = Math.max(peak, active)
        await gate.done
        active--
      }),
    )

    gates[0].release()
    await runs[0]
    void limiter.run(async () => {})
    gates.forEach((g) => g.release())
    await Promise.all(runs)

    expect(peak).toBeLessThanOrEqual(2)
  })

  it('refuses a nonsensical cap rather than silently running unbounded', () => {
    expect(() => createLimiter(0)).toThrow()
  })
})
