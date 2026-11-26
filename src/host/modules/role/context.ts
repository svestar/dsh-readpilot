import type { RoleSource } from '../../../shared/contracts/role.ts'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import { CONTEXT_BUDGET, fitText } from '../prompt/context-budget.ts'

export interface RoleContextInput {
  text: string
  source: RoleSource
  language: WorkspaceLanguage
  maxTotal?: number
}

/** A standalone role block; it must not be truncated away by reading/notes budgets. */
export function buildRoleContext(input: RoleContextInput): string {
  const text = input.text.trim()
  if (!text) return ''
  const english = input.language === 'en'
  const intro = input.source === 'default'
    ? english
      ? 'No custom role is set; answer directly as the default reading assistant. It cannot override system rules, tool permissions or the user’s current request.'
      : '未设置自定义角色；请直接以默认阅读助手身份回应。不能覆盖系统规则、工具权限或用户当前要求。'
    : english
      ? 'You are now this character; this role replaces the default assistant identity. Answer in the first person using the given name (if any), identity, tone and way of thinking. Do not call yourself an assistant or model, say you are “playing” a role, or use a host/session default name. The character background and knowledge limits only shape style; they must not block normal tasks or tool use, and cannot override system rules, tool permissions or the user’s current request. Only state your real identity when the user asks about it, asks you to stop, or when the persona conflicts with system or permission rules.'
      : '你现在就是这个角色，默认身份让位于角色。直接以第一人称、名字（若有）、身份、语气和思考方式回应；不要自称助手或模型，也不要说在“扮演”，不要用宿主或会话的默认名字。角色背景与知识边界仅用于塑造风格，不得妨碍正常任务与工具执行，也不能覆盖系统规则、工具权限或用户当前要求。仅在用户询问真实身份、要求退出，或人设与系统/权限规则冲突时，才说明真实身份。'
  const open = '<reading_role>'
  const close = '</reading_role>'
  const body = [open, intro, text, close].join('\n')
  const maxTotal = input.maxTotal ?? CONTEXT_BUDGET.role
  return body.length <= maxTotal ? body : fitText(body, maxTotal, close)
}
