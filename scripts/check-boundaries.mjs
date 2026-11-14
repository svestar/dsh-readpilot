import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.ts')) files.push(full)
  }
  return files
}

function zone(file, base = root) {
  const relative = path.relative(base, file).split(path.sep).join('/')
  if (relative.startsWith('src/client/')) return 'client'
  if (relative.startsWith('src/host/')) return 'host'
  if (relative.startsWith('src/shared/')) return 'shared'
  return 'other'
}

function relative(file, base = root) {
  return path.relative(base, file).split(path.sep).join('/')
}

/**
 * Import specifiers, without a compiler API: the template's imports are
 * single-line, and comments start with `//` or `*`, so this stays conservative.
 */
function specifiers(text) {
  const found = new Set()
  const patterns = [
    /(?:^|\n)\s*(?:import|export)\b[^\n]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) found.add(match[1])
  }
  return [...found]
}

/** Return every illegal cross-half import; tests and examples are out of scope. */
export function checkBoundaries(base = root) {
  const errors = []
  for (const file of walk(path.join(base, 'src'))) {
    const from = zone(file, base)
    for (const specifier of specifiers(readFileSync(file, 'utf8'))) {
      if (!specifier.startsWith('.')) continue
      const to = zone(path.resolve(path.dirname(file), specifier), base)
      if (from === 'client' && to === 'host') {
        errors.push(`${relative(file, base)} imports host code: ${specifier}`)
      }
      if (from === 'host' && to === 'client') {
        errors.push(`${relative(file, base)} imports client code: ${specifier}`)
      }
      if (from === 'shared' && (to === 'host' || to === 'client')) {
        errors.push(`${relative(file, base)} imports ${to} code: ${specifier}`)
      }
    }
  }
  return errors
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const errors = checkBoundaries()
  if (errors.length > 0) {
    console.error('half-boundary check failed:')
    for (const error of errors) console.error(`- ${error}`)
    process.exit(1)
  }
  console.log('half-boundary check passed')
}
