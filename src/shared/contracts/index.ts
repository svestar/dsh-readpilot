import { LIBRARY_ENDPOINTS } from './library.ts'
import { READING_ENDPOINTS } from './reading.ts'
import { SEARCH_ENDPOINT } from './search.ts'
import { NOTES_ENDPOINTS } from './notes.ts'
import { MEMORY_ENDPOINT } from './memory.ts'
import { PROMPTS_ENDPOINT } from './prompts.ts'
import { COMPANION_ENDPOINTS } from './companion.ts'
import { ACTIONS_ENDPOINTS } from './actions.ts'
import { BACKUP_ENDPOINTS } from './backup.ts'

export * from './library.ts'
export * from './reading.ts'
export * from './companion.ts'
export * from './notes.ts'
export * from './search.ts'
export * from './memory.ts'
export * from './prompts.ts'
export * from './actions.ts'
export * from './backup.ts'

/**
 * Every RPC endpoint the Host must register, grouped by module.
 *
 * `tests/contract.test.ts` asserts this list and the registered handlers are the
 * same set, so an endpoint cannot be implemented without being declared, or
 * declared without being implemented.
 */
export const OPERATIONS = [
  ...Object.values(LIBRARY_ENDPOINTS).map(endpoint => ({ endpoint, module: 'library' })),
  ...Object.values(READING_ENDPOINTS).map(endpoint => ({ endpoint, module: 'reading' })),
  { endpoint: SEARCH_ENDPOINT, module: 'search' },
  ...Object.values(NOTES_ENDPOINTS).map(endpoint => ({ endpoint, module: 'notes' })),
  { endpoint: MEMORY_ENDPOINT, module: 'memory' },
  { endpoint: PROMPTS_ENDPOINT, module: 'prompts' },
  ...Object.values(COMPANION_ENDPOINTS).map(endpoint => ({ endpoint, module: 'companion' })),
  ...Object.values(ACTIONS_ENDPOINTS).map(endpoint => ({ endpoint, module: 'actions' })),
  ...Object.values(BACKUP_ENDPOINTS).map(endpoint => ({ endpoint, module: 'backup' })),
] as const

export type Operation = (typeof OPERATIONS)[number]
