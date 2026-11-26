export interface PromptContextSource {
  companionContextOf(sessionId: unknown): string
  notesContextFor(sessionId: unknown): string
  memoryContextFor(sessionId: unknown): string
  readerGuardOf(sessionId: unknown): string
}

/** Register the global guard plus the three reader context blocks. */
export function registerPromptContexts(ctx: any, source: PromptContextSource): void {
  ctx.inject(['systemPrompt'], (scope: any) => {
    scope.effect(() => scope.systemPrompt.context({
      name: 'dsh-readpilot:guard',
      order: 9490,
      interpolate: false,
      text: ({ agent }: any) => source.readerGuardOf(agent?.session?.id),
    }), 'dsh-readpilot: reader guard')
    scope.effect(() => scope.systemPrompt.context({
      name: 'dsh-readpilot:reading',
      order: 9500,
      interpolate: false,
      text: ({ agent }: any) => source.companionContextOf(agent?.session?.id),
    }), 'dsh-readpilot: reading context')
    scope.effect(() => scope.systemPrompt.context({
      name: 'dsh-readpilot:notes',
      order: 9510,
      interpolate: false,
      text: ({ agent }: any) => source.notesContextFor(agent?.session?.id),
    }), 'dsh-readpilot: notes context')
    scope.effect(() => scope.systemPrompt.context({
      name: 'dsh-readpilot:memory',
      order: 9520,
      interpolate: false,
      text: ({ agent }: any) => source.memoryContextFor(agent?.session?.id),
    }), 'dsh-readpilot: memory context')
  })
}
