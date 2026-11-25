export const PROMPTS_ENDPOINT = 'prompts'

export interface PromptPreset {
  id: string
  title: string
  template: string
  builtin: boolean
  /** A built-in template changed by the user; never localized automatically. */
  edited?: boolean
}
