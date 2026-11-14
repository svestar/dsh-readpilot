import { SHELL_STYLES } from './shell.ts'
import { SHELL_CHAT_STYLES } from './shell-chat.ts'
import { READER_STYLES } from './reader.ts'
import { PANEL_STYLES } from './panel.ts'

/** Every stylesheet the reader panel, sidebar reader and dialogs depend on. */
export const CSS = [SHELL_STYLES, SHELL_CHAT_STYLES, READER_STYLES, PANEL_STYLES].join('\n')
