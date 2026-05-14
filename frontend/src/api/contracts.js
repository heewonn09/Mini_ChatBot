function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

export function normalizeAnalysisViewPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid analysis payload: expected object')
  }

  const thresholds = payload.thresholds && typeof payload.thresholds === 'object'
    ? payload.thresholds
    : {}

  const normalizedThresholds = {
    negative_emotion_ratio_threshold: isFiniteNumber(thresholds.negative_emotion_ratio_threshold)
      ? thresholds.negative_emotion_ratio_threshold
      : 40,
    negative_emotion_intensity_threshold: isFiniteNumber(thresholds.negative_emotion_intensity_threshold)
      ? thresholds.negative_emotion_intensity_threshold
      : 6,
    mood_swing_threshold: isFiniteNumber(thresholds.mood_swing_threshold)
      ? thresholds.mood_swing_threshold
      : 5,
    high_severity_ratio_threshold: isFiniteNumber(thresholds.high_severity_ratio_threshold)
      ? thresholds.high_severity_ratio_threshold
      : 60,
  }

  return {
    insights: Array.isArray(payload.insights) ? payload.insights : [],
    behavior_distribution: Array.isArray(payload.behavior_distribution) ? payload.behavior_distribution : [],
    weekly_pattern: Array.isArray(payload.weekly_pattern) ? payload.weekly_pattern : [],
    recommendations: Array.isArray(payload.recommendations) ? payload.recommendations : [],
    thresholds: normalizedThresholds,
  }
}
