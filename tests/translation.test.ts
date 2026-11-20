import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReaderApi } from '../src/host/app.ts'
import { translationBlocksOf } from '../src/client/modules/translation/TranslationPanel.ts'
import { fakeContext } from './support/api-helpers.ts'

function translatorFixture() {
  const calls: any[] = []
  const requests: any[] = []
  return {
    calls,
    requests,
    translator: {
      async availableProviders() {
        return ['google', 'bing', 'deepseek-account']
      },
      resolve(request: any) {
        requests.push(request)
        if (request.text === 'too long') throw new Error('request too long')
        return {
          ...request,
          provider: request.provider ?? 'google',
          sourceLanguage: request.sourceLanguage ?? 'en',
          targetLanguage: request.targetLanguage,
        }
      },
      async translate(spec: any) {
        calls.push(spec)
        return `[${spec.provider}] ${spec.text}`
      },
    },
  }
}

async function setup(t: any) {
  const data = await mkdtemp(join(tmpdir(), 'dsh-readpilot-translation-'))
  t.after(() => rm(data, { recursive: true, force: true }))
  const fixture = translatorFixture()
  const api = createReaderApi({ ctx: fakeContext({ translator: fixture.translator }), dataDir: data })
  return { api, calls: fixture.calls, requests: fixture.requests }
}

test('translation_providers_and_cache', async t => {
  const { api, calls, requests } = await setup(t)
  const providers = await api.translationProviders()
  assert.equal(providers.available, true)
  assert.deepEqual(providers.providers.map((provider: any) => provider.id), ['google', 'bing', 'deepseek-account'])
  assert.equal(providers.providers.find((provider: any) => provider.id === 'deepseek-account')?.paid, true)

  const first = await api.translate({ text: 'Hello', targetLanguage: 'zh-CN', sessionId: 'session-1' })
  assert.deepEqual(first, { text: '[google] Hello', provider: 'google', targetLanguage: 'zh-CN', cached: false })
  assert.equal(requests[0].sessionId, undefined)
  const second = await api.translate({ text: 'Hello', targetLanguage: 'zh-CN' })
  assert.equal(second.cached, true)
  assert.equal(second.text, first.text)
  assert.equal(calls.length, 1)

  const bing = await api.translate({ text: 'Hello', targetLanguage: 'zh-CN', provider: 'bing' })
  assert.equal(bing.provider, 'bing')
  assert.equal(bing.cached, false)
  assert.equal(calls.length, 2)

  const paid = await api.translate({
    text: 'Paid text',
    targetLanguage: 'zh-CN',
    provider: 'deepseek-account',
    sessionId: 'session-1',
  })
  assert.equal(paid.provider, 'deepseek-account')
  assert.equal(requests.at(-1)?.sessionId, 'session-1')
})

test('translation_batch_isolates_failures', async t => {
  const { api } = await setup(t)
  const result = await api.translateBatch({
    targetLanguage: 'zh-CN',
    items: [
      { id: 'a', text: 'Hello' },
      { id: 'b', text: 'too long' },
      { id: 'c', text: 'World' },
    ],
  })
  assert.equal(result.items.length, 3)
  const byId = new Map(result.items.map((item: any) => [item.id, item]))
  assert.equal(byId.get('a')?.text, '[google] Hello')
  assert.match(byId.get('b')?.error ?? '', /too long/)
  assert.equal(byId.get('c')?.text, '[google] World')
})

test('translation_cache_clears', async t => {
  const { api, calls } = await setup(t)
  await api.translate({ text: 'Hello', targetLanguage: 'zh-CN' })
  await api.translationCacheClear()
  await api.translate({ text: 'Hello', targetLanguage: 'zh-CN' })
  assert.equal(calls.length, 2)
})

test('translation_blocks_skip_images_and_code', () => {
  const blocks = translationBlocksOf({
    chapterId: 'c1',
    title: 'Chapter',
    locator: 'c1:0',
    blocks: [
      { type: 'p', text: 'Hello' },
      { type: 'image', text: '' },
      { type: 'code', text: 'const a = 1' },
      { type: 'h', text: 'Title' },
      { type: 'table', text: '', rows: [['A', 'B']] },
    ],
  } as any)
  assert.deepEqual(blocks.map(block => block.index), [0, 3, 4])
  assert.equal(blocks[2].text, 'A | B')
})

test('translation_falls_back_without_host_translator', async t => {
  const data = await mkdtemp(join(tmpdir(), 'dsh-readpilot-translation-fallback-'))
  t.after(() => rm(data, { recursive: true, force: true }))
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const originalFetch = globalThis.fetch
  const calls: any[] = []
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify([{ translations: [{ text: '你好' }] }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as any
  t.after(() => { globalThis.fetch = originalFetch })

  const providers = await api.translationProviders()
  assert.equal(providers.available, true)
  assert.deepEqual(providers.providers.map((provider: any) => provider.id), ['bing', 'google'])

  const result = await api.translate({ text: 'Hello', targetLanguage: 'zh-CN' })
  assert.equal(result.text, '你好')
  assert.equal(result.provider, 'bing')
  assert.match(calls[0].url, /edge\.microsoft\.com/)
  assert.match(String(calls[0].init.body), /Hello/)
})
