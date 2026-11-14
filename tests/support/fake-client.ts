/**
 * A Client context stand-in for tests.
 *
 * The client half only talks to `ctx.slots` and `ctx.effect`, so this stand-in
 * can prove slot names, ids and keys without a browser. A wrong slot name is
 * otherwise silent: the panel simply never appears.
 */

export interface FakeSlotRegistration {
  name: string
  options: any
  component: unknown
}

export interface FakeClient {
  ctx: any
  registrations: FakeSlotRegistration[]
  dispose(): void
}

export function createFakeClient(): FakeClient {
  const registrations: FakeSlotRegistration[] = []
  const disposers: Array<() => void> = []
  const ctx = {
    effect(callback: () => unknown) {
      const dispose = callback()
      if (typeof dispose === 'function') disposers.push(dispose as () => void)
      return dispose
    },
    slots: {
      inject(_name: string, callback: () => unknown) {
        return callback()
      },
      register(options: any, component: unknown) {
        registrations.push({ name: options.name, options, component })
        return () => {}
      },
    },
  }

  return {
    ctx,
    registrations,
    dispose() {
      for (const dispose of disposers.reverse()) {
        try {
          dispose()
        } catch {
          // Teardown of a test double is best effort.
        }
      }
      disposers.length = 0
    },
  }
}
