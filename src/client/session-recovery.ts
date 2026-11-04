import { messageOf } from './helpers.ts'

/** True when a companion session was archived, deleted, or otherwise lost. */
export function isMissingSessionError(error: unknown): boolean {
  const text = messageOf(error).toLowerCase()
  return /archiv|not.?found|unknown session|no such session|does not exist|closed|deleted|missing|已归档|归档|不存在|已删除|已关闭|找不到.{0,8}会话/.test(text)
}
