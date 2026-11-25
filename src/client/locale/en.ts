import { enErrors } from './errors.ts'
import { enReader } from './en-reader.ts'
import { enWorkspace } from './en-workspace.ts'

export const en = { ...enReader, ...enWorkspace, ...enErrors }
