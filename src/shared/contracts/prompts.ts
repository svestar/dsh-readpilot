export const PROMPTS_ENDPOINT = 'prompts'

export interface PromptPreset {
  id: string
  title: string
  template: string
  builtin: boolean
}
