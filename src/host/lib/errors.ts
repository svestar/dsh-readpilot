/** An Error with a stable `code`, so the HTTP envelope can answer without string matching. */
export class PluginError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'PluginError'
    this.code = code
  }
}

/** The reader's domain error; same wire shape as `PluginError`. */
export class ReaderError extends PluginError {
  constructor(code: string, message: string) {
    super(code, message)
    this.name = 'ReaderError'
  }
}

/** Read a stable error code from any thrown value. */
export function errorCode(error: unknown, fallback: string): string {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === 'string' && code !== '' ? code : fallback
}
