import { createPlugin } from './plugin.ts'

export function create(require: (name: string) => any) {
  return createPlugin(require)
}
