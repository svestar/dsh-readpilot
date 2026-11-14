/**
 * The HTTP envelope both halves speak.
 *
 * Module-specific endpoints and wire shapes live next to their module (for
 * example `src/shared/contracts/ping.ts`); only what every module shares
 * belongs here.
 */
export type RpcResponse<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string; details?: Record<string, unknown> } }
