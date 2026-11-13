export interface HelpTopic {
  id: string
  titleKey: string
  bodyKey: string
}

export const HELP_TOPICS: readonly HelpTopic[] = [
  { id: 'start', titleKey: 'helpQuickStartTitle', bodyKey: 'helpQuickStartBody' },
  { id: 'reading', titleKey: 'helpReadingTitle', bodyKey: 'helpReadingBody' },
  { id: 'annotate', titleKey: 'helpAnnotateTitle', bodyKey: 'helpAnnotateBody' },
  { id: 'companion', titleKey: 'helpCompanionTitle', bodyKey: 'helpCompanionBody' },
  { id: 'notes', titleKey: 'helpNotesTitle', bodyKey: 'helpNotesBody' },
  { id: 'history', titleKey: 'helpHistoryTitle', bodyKey: 'helpHistoryBody' },
  { id: 'shortcuts', titleKey: 'helpShortcutsTitle', bodyKey: 'helpShortcutsBody' },
  { id: 'faq', titleKey: 'helpFaqTitle', bodyKey: 'helpFaqBody' },
]
