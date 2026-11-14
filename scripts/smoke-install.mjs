// Installs this checkout into a throwaway DSH home and checks that DSH accepted
// it, as a user's install would.
//
//   pnpm run smoke                 # default `web` profile
//   pnpm run smoke -- --keep       # leave the temp home behind for inspection
//   DSH_BIN=<path to dsh> pnpm run smoke
//
// This is deliberately outside `pnpm run verify`: it needs a DSH CLI and network
// access for the profile's own dependencies. `verify` covers the code and the
// package; this covers "DSH actually mounts it".
//
// Security: only ever writes to a fresh `dsh-smoke-*` directory under the OS
// temp dir, and refuses to delete anything else. Your own DSH home is never
// touched — if the CLI turns out to have ignored DSH_HOME, the manifest check
// below fails with that exact diagnosis.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const profileFlag = process.argv.indexOf('--profile')
// The profile comes from the package, not from the environment: a running DSH
// exports DSH_PROFILE=desktop, and a throwaway home has no initialized desktop
// profile to add into.
const profile = profileFlag === -1 ? (pkg.dsh?.client ? 'web' : 'headless') : process.argv[profileFlag + 1]
if (typeof profile !== 'string' || profile === '') {
  console.error('smoke: --profile needs a value.')
  process.exit(1)
}
const cli = process.env.DSH_BIN ?? 'dsh'
const keep = process.argv.includes('--keep')
const shell = process.platform === 'win32'
// With `shell: true` the command line is concatenated, not escaped, so a path
// containing spaces has to be quoted here or it splits into extra arguments.
const quote = value => (shell && /[\s"]/.test(value) ? `"${value}"` : value)
const command = quote(cli)
const target = quote(root)

function fail(message) {
  console.error(`smoke: ${message}`)
  process.exit(1)
}

function runDsh(home, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    shell,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: { ...process.env, DSH_HOME: home },
    timeout: 240_000,
  })
  if (result.error) fail(`could not run ${cli}: ${result.error.message}`)
  if (result.status !== 0) {
    const detail = capture ? `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() : ''
    fail(`${cli} ${args.join(' ')} exited ${result.status}${detail === '' ? '' : `\n${detail}`}`)
  }
  return result.stdout ?? ''
}

const probe = spawnSync(command, ['--version'], { shell, encoding: 'utf8', timeout: 60_000 })
if (probe.error || probe.status !== 0) {
  fail(
    `no DSH CLI found (${cli}). Install DeepSeek Harness or point DSH_BIN at its ` +
      `command, then retry. \`pnpm run verify\` does not need this.`,
  )
}

const base = fs.realpathSync(os.tmpdir())
const home = fs.mkdtempSync(path.join(base, 'dsh-smoke-'))
const cleanup = () => {
  // Only ever this exact directory: a path from the environment is not trusted.
  if (path.dirname(home) !== base || !path.basename(home).startsWith('dsh-smoke-')) {
    throw new Error(`Refusing to delete unexpected path ${home}.`)
  }
  fs.rmSync(home, { recursive: true, force: true })
}

try {
  console.log(`smoke: installing ${pkg.name}@${pkg.version} into ${home} (${profile} profile)`)
  runDsh(home, ['plugin', '--profile', profile, 'add', target])

  const manifestPath = path.join(home, 'profiles', profile, 'package.json')
  if (!fs.existsSync(manifestPath)) {
    fail(
      `Isolation check failed: ${manifestPath} does not exist.\n` +
        `The CLI did not use DSH_HOME=${home}; stop and check which home was modified.`,
    )
  }
  const bundles = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).dsh?.profile?.bundles ?? []
  if (!bundles.includes(pkg.name)) {
    fail(`${pkg.name} is not an active bundle in ${manifestPath}.`)
  }

  const config = runDsh(home, ['--profile', profile, '--dump-config'], { capture: true })
  if (!config.includes(`# == ${pkg.name}`)) {
    fail(`--dump-config has no "# == ${pkg.name}" section; the bundle patch did not compose.`)
  }

  console.log(`smoke: ${pkg.name} installed, listed as a bundle, and composed into the ${profile} profile.`)
  console.log('smoke: this proves installation and composition, not runtime activation — start DSH and check the page for that.')
} finally {
  if (keep) console.log(`smoke: kept ${home}`)
  else cleanup()
}
