export type TextFn = (key: string) => string

export type CallRpc = (endpoint: string, payload?: unknown) => Promise<any>
