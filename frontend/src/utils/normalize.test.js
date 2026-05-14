import { describe, expect, it } from 'vitest'

import { normalizeCategory, normalizeMood } from './normalize'

describe('normalize utilities', () => {
  it('normalizes category aliases', () => {
    expect(normalizeCategory('workout')).toBe('Exercise')
    expect(normalizeCategory('study')).toBe('Study')
  })

  it('normalizes mood aliases', () => {
    expect(normalizeMood('joyful')).toBe('happy')
    expect(normalizeMood('frustrated')).toBe('angry')
  })
})
