import { createEpubArchive } from './archive.ts'
import { createEpubAsset } from './asset.ts'
import { createEpubDocument } from './document.ts'
import type { EpubVisual } from './types.ts'

export function createEpubVisual({ dataDir }: { dataDir?: string } = {}): EpubVisual {
  if (typeof dataDir !== 'string' || !dataDir) throw new Error('dataDir is required')
  const archive = createEpubArchive({ dataDir })
  const document = createEpubDocument(archive)
  const asset = createEpubAsset(archive)
  return {
    prepare: request => archive.prepare(request),
    readDocument: document,
    readAsset: asset.readAsset,
    cover: asset.cover,
  }
}

export type { EpubAssetResult, EpubDocumentResult } from '../../../../../shared/contracts/reading.ts'
export type { EpubRecord, EpubVisual } from './types.ts'
