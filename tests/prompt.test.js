import test from 'node:test'
import assert from 'node:assert/strict'
import { installReadingPrompt, READING_PROMPT } from '../src/prompt.js'

test('reading_prompt_section_registered', () => {
  let section
  let effectLabel = ''
  const ctx = {
    get(name) {
      if (name === 'systemPrompt') {
        return {
          section(definition) {
            section = definition
            return () => {}
          },
        }
      }
      return undefined
    },
    effect(fn, label) {
      effectLabel = label
      return fn()
    },
  }

  installReadingPrompt(ctx)
  assert.equal(section.name, 'dsh-reader:reading-assistant')
  assert.equal(section.order, 9000)
  assert.equal(section.interpolate, false)
  assert.equal(section.text, READING_PROMPT)
  assert.match(section.text, /reader_context/)
  assert.match(effectLabel, /reading assistant/)
})

test('reading_prompt_optional_service_does_not_throw', () => {
  assert.doesNotThrow(() => installReadingPrompt({ get() { return undefined }, effect() {} }))
  assert.doesNotThrow(() => installReadingPrompt({ get() { throw new Error('missing') }, effect() {} }))
})
