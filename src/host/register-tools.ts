import type { HostModule, ToolContext } from './types.ts'
import { losslessJson } from './lib/lossless-json.ts'

export function registerTools(ctx: ToolContext, modules: readonly HostModule[]): () => void {
  const disposers: Array<() => void> = []
  try {
    for (const module of modules) {
      for (const tool of module.tools) {
        const definition = { ...tool }
        delete definition.prompt
        disposers.push(ctx.tools.register({
          ...definition,
          async execute(args?: any, exec?: any) {
            return losslessJson(await tool.execute(args, exec))
          },
        }))
      }
    }
  } catch (error) {
    for (const dispose of disposers.reverse()) dispose()
    throw error
  }
  return () => {
    for (const dispose of disposers.reverse()) dispose()
  }
}
