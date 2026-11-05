/** Run async tasks with a fixed concurrency ceiling; queued tasks start in FIFO order. */
export function createLimiter(limit: number) {
  const ceiling = Number.isInteger(limit) && limit > 0 ? limit : 1
  let active = 0
  const waiters: Array<() => void> = []

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= ceiling) {
      await new Promise<void>(resolve => waiters.push(resolve))
    }
    active += 1
    try {
      return await task()
    } finally {
      active -= 1
      const next = waiters.shift()
      if (next) next()
    }
  }
}
