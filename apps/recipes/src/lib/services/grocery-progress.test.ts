import { describe, it, expect } from 'vitest'
import {
  detectNextGroceryStage,
  detectAllNewGroceryStages,
  extractGeminiChunkText,
} from './grocery-progress'

describe('detectNextGroceryStage', () => {
  it('returns the "start" stage once text passes the length threshold', () => {
    const found = new Set<string>()
    const update = detectNextGroceryStage('x'.repeat(51), found)
    expect(update).toEqual({ progress: 10, message: 'Analyzing recipes...' })
    expect(found.has('start')).toBe(true)
  })

  it('does not re-detect "start" once already found', () => {
    const found = new Set<string>(['start'])
    expect(detectNextGroceryStage('x'.repeat(100), found)).toBeNull()
  })

  it('detects a category stage in the accumulated text', () => {
    const found = new Set<string>(['start'])
    const update = detectNextGroceryStage('{"category": "Produce"', found)
    expect(update).toEqual({ progress: 25, message: 'Selecting fresh produce...' })
    expect(found.has('produce')).toBe(true)
  })

  it('treats Pantry and Spices as the same stage', () => {
    const found = new Set<string>(['start'])
    expect(detectNextGroceryStage('"category": "Spices"', found)).toEqual({
      progress: 60,
      message: 'Auditing pantry essentials...',
    })
  })

  it('returns null when nothing new is found', () => {
    const found = new Set<string>(['start', 'produce', 'meat', 'pantry', 'dairy', 'frozen'])
    expect(detectNextGroceryStage('anything', found)).toBeNull()
  })
})

describe('detectAllNewGroceryStages', () => {
  it('detects every stage present in one big chunk of text', () => {
    const found = new Set<string>()
    const text = `${'x'.repeat(60)} "category": "Produce" "category": "Meat" "category": "Dairy"`
    const updates = detectAllNewGroceryStages(text, found)
    expect(updates.map((u) => u.message)).toEqual([
      'Analyzing recipes...',
      'Selecting fresh produce...',
      'Checking butcher & seafood...',
      'Reviewing dairy & eggs...',
    ])
  })

  it('returns an empty array once all stages are already found', () => {
    const found = new Set(['start', 'produce', 'meat', 'pantry', 'dairy', 'frozen'])
    expect(detectAllNewGroceryStages('irrelevant', found)).toEqual([])
  })
})

describe('extractGeminiChunkText', () => {
  it('extracts text from the candidates/content/parts shape', () => {
    const chunk = { candidates: [{ content: { parts: [{ text: 'hello' }] } }] }
    expect(extractGeminiChunkText(chunk)).toBe('hello')
  })

  it('extracts text from a direct .text property', () => {
    expect(extractGeminiChunkText({ text: 'world' })).toBe('world')
  })

  it('handles a plain string chunk', () => {
    expect(extractGeminiChunkText('raw text')).toBe('raw text')
  })

  it('returns empty string for an unrecognized shape', () => {
    expect(extractGeminiChunkText({ foo: 'bar' })).toBe('')
    expect(extractGeminiChunkText(null)).toBe('')
    expect(extractGeminiChunkText(undefined)).toBe('')
  })
})
