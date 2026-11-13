const tails = new Map<string, Promise<unknown>>()

/**
 * Serialize read-modify-write tasks that share one file. Tasks with different
 * keys still run concurrently; a failed task never blocks the next one.
 */
export function enqueueWrite<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve()
  const next = previous.then(task, task)
  const tail = next.then(() => undefined, () => undefined)
  tails.set(key, tail)
  void tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key)
  })
  return next
}

/** Test helper: number of queued keys that have not settled yet. */
export function pendingWriteKeys(): number {
  return tails.size
}
