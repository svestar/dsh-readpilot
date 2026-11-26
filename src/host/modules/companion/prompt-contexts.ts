import { assembleReaderContexts } from '../prompt/context-budget.ts'

export interface PromptContextSource {
  companionContextOf(sessionId: unknown): string
  notesContextFor(sessionId: unknown): string
  memoryContextFor(sessionId: unknown): string
  readerGuardOf(sessionId: unknown): string
}

/** Register the global guard plus one assembled reader context block. */
export function registerPromptContexts(ctx: any, source: PromptContextSource): void {
  ctx.inject(['systemPrompt'], (scope: any) => {
    scope.effect(() => scope.systemPrompt.context({
      name: 'dsh-readpilot:guard',
      order: 9490,
      interpolate: false,
      text: ({ agent }: any) => source.readerGuardOf(agent?.session?.id),
    }), 'dsh-readpilot: reader guard')
    scope.effect(() => scope.systemPrompt.context({
      name: 'dsh-readpilot:context',
      order: 9500,
      interpolate: false,
      text: ({ agent }: any) => {
        const sessionId = agent?.session?.id
        return assembleReaderContexts({
          reading: source.companionContextOf(sessionId),
          memory: source.memoryContextFor(sessionId),
          notes: source.notesContextFor(sessionId),
        })
      },
    }), 'dsh-readpilot: reader context')
  })
}
