import z from '@deepseek-ai/schemastery'
import { createApp } from './src/host/app.ts'
import { pluginDataDir, resolveDshHome } from './src/host/home.ts'
import { registerHttp } from './src/host/http.ts'
import { registerTools } from './src/host/register-tools.ts'
import { registerPromptContexts } from './src/host/modules/companion/prompt-contexts.ts'

export const name = 'dsh-readpilot'
export const inject = ['tools']

/**
 * Plugin configuration.
 *
 * Declared as a schema so DSH resolves defaults and rejects bad values before
 * `apply` runs; users override keys in their profile's `cordis.patch.yml`
 * (example in this package's `cordis.patch.yml`).
 */
export interface Config {
  /** Whether the plugin registers its tools, routes and state at all. */
  enabled: boolean
}

export const Config = z.object({
  enabled: z.boolean().default(true).description('Enable the plugin.'),
})

export function apply(ctx: any, config: Partial<Config> = {}): void {
  // A disabled plugin registers nothing, so it also writes no state.
  if (config.enabled === false) return

  const app = createApp({ dataDir: pluginDataDir(resolveDshHome()), ctx })
  void app.api.syncCompanionContexts().catch(() => {})
  void app.api.syncPrompt().catch(() => {})

  ctx.effect(() => registerTools(ctx, app.modules), 'dsh-readpilot: tools')
  ctx.effect(() => () => { void app.dispose() }, 'dsh-readpilot: dispose')

  registerHttp(ctx, app)
  registerPromptContexts(ctx, app.api)
}
