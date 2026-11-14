import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../index.ts'
import { createFakeHost } from './support/fake-host.ts'

/**
 * Boot the Host half against a temporary `DSH_HOME` and speak to it over real
 * `Request` objects. This is the cheapest check that the registered route, its
 * envelope, and its error mapping actually work — `typecheck` cannot see any of
 * that, and the UI only notices after the plugin is installed.
 */
test('rpc_route_answers_endpoints_and_rejects_unknown', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-readpilot-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  const host = createFakeHost()
  try {
    apply(host.ctx)

    assert.equal(host.routes.length, 7)
    const route = host.routes[0]
    assert.equal(route.path, '/api/dsh-readpilot')
    assert.deepEqual(route.methods, ['POST'])
    assert.equal(route.requestBody, 'buffered')
    assert.equal(host.tools.length, 14)

    const state = await host.call('state')
    assert.equal(state.status, 200)
    assert.equal(state.body.ok, true)
    assert.equal(state.body.value.settings.libraryDir, null)
    assert.deepEqual(state.body.value.books, [])

    const unknown = await host.call('nope')
    assert.equal(unknown.status, 400)
    assert.equal(unknown.body.ok, false)
    assert.equal(unknown.body.error.code, 'unknown-endpoint')

    const invalid = await host.call(null)
    assert.equal(invalid.body.ok, false)
    assert.equal(invalid.body.error.code, 'bad-request')
  } finally {
    host.dispose()
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  }
})

test('media_route_serves_the_plugin_icon_with_cache_headers', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-readpilot-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  const host = createFakeHost()
  try {
    apply(host.ctx)
    const route = host.routes.find(item => item.path === '/api/dsh-readpilot/icon')
    assert.ok(route)
    assert.deepEqual(route.methods, ['GET'])

    const response = await host.request('/api/dsh-readpilot/icon')
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/svg+xml')
    assert.match(response.headers.get('cache-control') ?? '', /immutable/)
    assert.match(await response.text(), /<svg/)
  } finally {
    host.dispose()
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  }
})

test('rpc_route_rejects_a_malformed_body', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-readpilot-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  const host = createFakeHost()
  try {
    apply(host.ctx)
    const response = await host.request('/api/dsh-readpilot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    })
    assert.equal(response.status, 400)
    assert.equal(((await response.json()) as any).error.code, 'bad-request')
  } finally {
    host.dispose()
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  }
})
