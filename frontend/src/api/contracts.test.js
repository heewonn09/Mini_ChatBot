import { describe, expect, it } from 'vitest'

import { normalizeAnalysisViewPayload } from './contracts'

describe('normalizeAnalysisViewPayload', () => {
  it('fills default thresholds when missing', () => {
    const normalized = normalizeAnalysisViewPayload({
      insights: [],
      behavior_distribution: [],
      weekly_pattern: [],
      recommendations: [],
    })

    expect(normalized.thresholds.negative_emotion_ratio_threshold).toBe(40)
    expect(normalized.thresholds.negative_emotion_intensity_threshold).toBe(6)
    expect(normalized.thresholds.mood_swing_threshold).toBe(5)
    expect(normalized.thresholds.high_severity_ratio_threshold).toBe(60)
  })

  it('keeps server thresholds when valid', () => {
    const normalized = normalizeAnalysisViewPayload({
      insights: [],
      behavior_distribution: [],
      weekly_pattern: [],
      recommendations: [],
      thresholds: {
        negative_emotion_ratio_threshold: 42,
        negative_emotion_intensity_threshold: 7,
        mood_swing_threshold: 4,
        high_severity_ratio_threshold: 65,
      },
    })

    expect(normalized.thresholds.negative_emotion_ratio_threshold).toBe(42)
    expect(normalized.thresholds.negative_emotion_intensity_threshold).toBe(7)
    expect(normalized.thresholds.mood_swing_threshold).toBe(4)
    expect(normalized.thresholds.high_severity_ratio_threshold).toBe(65)
  })
})
