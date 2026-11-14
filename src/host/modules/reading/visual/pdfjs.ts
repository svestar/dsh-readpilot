import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

/** PDF.js needs the WASM decoders for JBIG2/JPX images used by many scanned PDFs. */
export function pdfWasmUrl(): string {
  const entry = require.resolve('pdfjs-dist/legacy/build/pdf.mjs')
  return `${join(dirname(entry), '..', '..', 'wasm')}/`
}
