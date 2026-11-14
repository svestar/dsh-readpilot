// Checks the npm tarball contents without publishing anything.
//
// `pnpm run verify` runs this after `build`, so the tarball reflects what a user
// would install. It catches the failures a local dev loop cannot see: a `files`
// whitelist that drops the built host half, a missing client bundle, a broken
// `exports` map, or a dist entry that cannot be imported.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

if (!existsSync('dist/index.js')) {
  console.error('check-package: dist/index.js is missing. Run `pnpm build` first.')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
// `--ignore-scripts` keeps `prepack` from rebuilding inside the check.
const result = spawnSync('npm pack --dry-run --json --ignore-scripts', {
  encoding: 'utf8',
  shell: true,
})
if (result.status !== 0) {
  console.error(result.stderr || result.stdout)
  process.exit(1)
}

let report
try {
  ;[report] = JSON.parse(result.stdout)
} catch {
  console.error('check-package: could not parse `npm pack --dry-run --json` output.')
  process.exit(1)
}

const packed = new Set(report.files.map(file => file.path))
const errors = []
const required = [
  'package.json',
  'dist/index.js',
  'cordis.patch.yml',
  'locale/zh.json',
  'locale/en.json',
  'icon.svg',
  'README.md',
  'LICENSE',
]
if (pkg.dsh?.client) required.push('client.js')
for (const file of pkg.files ?? []) {
  // Globs are checked by the build output they stand for, not by literal name.
  if (!file.includes('*') && !packed.has(file)) required.push(file)
}
for (const file of new Set(required)) {
  if (!packed.has(file)) errors.push(`missing from package: ${file}`)
}

const normalizeTarget = value => String(value ?? '').replace(/^\.\//, '')
const exportsMap = pkg.exports ?? {}
if (pkg.main && normalizeTarget(exportsMap['.']) !== normalizeTarget(pkg.main)) {
  errors.push(`exports["."] (${exportsMap['.']}) must equal main (${pkg.main})`)
}
for (const [key, target] of Object.entries(exportsMap)) {
  if (typeof target !== 'string' || target.includes('*')) continue
  const file = target.replace(/^\.\//, '')
  if (!packed.has(file)) errors.push(`exports["${key}"] points outside the package: ${target}`)
}
const patch = pkg.dsh?.bundle?.patch
if (patch) {
  const file = String(patch).replace(/^\.\//, '')
  if (!packed.has(file)) errors.push(`dsh.bundle.patch is not packed: ${patch}`)
}

const leaked = [...packed].filter(file =>
  /^(src|tests|scripts|docs|\.github|node_modules)\//.test(file) || file === 'BOOTSTRAP.md',
)
if (leaked.length > 0) errors.push(`unexpected in package: ${leaked.join(', ')}`)

if (pkg.dsh?.client) {
  if (!existsSync('client.js')) {
    errors.push('client.js is required by dsh.client but missing')
  } else {
    const client = readFileSync('client.js', 'utf8')
    if (!client.includes(`id: '${pkg.name}'`)) {
      errors.push(`client.js is not registered under the package name: ${pkg.name}`)
    }
  }
}

let host
try {
  host = await import(pathToFileURL(join(process.cwd(), 'dist', 'index.js')).href)
} catch (error) {
  errors.push(`dist/index.js cannot be imported: ${error instanceof Error ? error.message : String(error)}`)
}
if (host && typeof host.apply !== 'function') {
  errors.push('dist/index.js must export apply()')
}

if (errors.length > 0) {
  console.error('Package check failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
console.log(`Package ok: ${packed.size} files, ${report.size} bytes.`)
