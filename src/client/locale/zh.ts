import { zhReader } from './zh-reader.ts'
import { zhWorkspace } from './zh-workspace.ts'

export const zh = { ...zhReader, ...zhWorkspace }
