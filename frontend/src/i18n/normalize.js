export function normalizeCategory(value = '') {
  const v = String(value).trim().toLowerCase();
  if (!v || v === 'categories.') return 'other';
  if (['study', '공부'].includes(v)) return 'study';
  if (['exercise', '운동', 'workout'].includes(v)) return 'exercise';
  if (['break', '휴식', 'rest'].includes(v)) return 'rest';
  if (['youtube', '유튜브'].includes(v)) return 'youtube';
  if (['social media', 'social_media', '소셜 미디어'].includes(v)) return 'social_media';
  return 'other';
}

export function normalizeMood(value = '') {
  const v = String(value).trim().toLowerCase();
  if (['happy', '행복'].includes(v)) return 'happy';
  if (['focused', '집중'].includes(v)) return 'focused';
  if (['stressed', '스트레스'].includes(v)) return 'stressed';
  if (['neutral', '보통'].includes(v)) return 'neutral';
  if (['motivated', '동기부여'].includes(v)) return 'motivated';
  if (['anxious', '불안'].includes(v)) return 'anxious';
  if (['sad', '슬픔'].includes(v)) return 'sad';
  if (['distracted', '산만'].includes(v)) return 'distracted';
  return 'neutral';
}
