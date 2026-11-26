import type { ToolDefinition } from '../../types.ts'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'

export interface ToolPromptLine {
  name: string
  zh: string
  en: string
}

function enumOf(parameters: Record<string, unknown>, key: string): string[] {
  const properties = parameters?.properties as Record<string, any> | undefined
  const values = properties?.[key]?.enum
  return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : []
}

function render(language: WorkspaceLanguage, summary: string, actions: string[], scopes: string[]): string {
  const details: string[] = []
  if (actions.length > 0) details.push(actions.join('/'))
  if (scopes.length > 0) details.push(language === 'en' ? `scope is ${scopes.join('/')}` : `scope 为 ${scopes.join('/')}`)
  if (details.length === 0) return summary
  return language === 'en'
    ? `${summary} (${details.join('; ')})`
    : `${summary}（${details.join('；')}）`
}

/** Build the localized core tool map from the registered tool schemas. */
export function buildToolPromptLines(tools: readonly ToolDefinition[]): ToolPromptLine[] {
  return tools.flatMap(tool => {
    const meta = tool.prompt
    if (!meta?.core) return []
    const actions = enumOf(tool.parameters, 'action')
    const scopes = enumOf(tool.parameters, 'scope')
    return [{
      name: tool.name,
      zh: render('zh', meta.summary.zh, actions, scopes),
      en: render('en', meta.summary.en, actions, scopes),
    }]
  })
}
