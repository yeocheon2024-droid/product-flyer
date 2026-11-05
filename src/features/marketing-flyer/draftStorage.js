export const PROMO_DRAFT_KEY = 'jigu-promo-draft-v1';
// 이전 운영 버전이 실제로 저장하던 v2를 오래된 v3 복원본보다 우선한다.
const DRAFT_KEYS = [PROMO_DRAFT_KEY, 'jigu-promo-duplex-v2', 'jigu-promo-reference-eight-v3'];

export function readPromoDraft(storage) {
  for (const key of DRAFT_KEYS) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      const draft = JSON.parse(raw);
      if (draft?.schemaVersion === 1 && draft.templateId === 'promo_duplex_food_v1' && Array.isArray(draft.frontPage?.heroProducts)) return draft;
    } catch {
      // 손상된 설정이 있으면 이전 저장본을 확인한다. 원본은 삭제하지 않는다.
    }
  }
  return null;
}

export function savePromoDraft(storage, template) {
  storage.setItem(PROMO_DRAFT_KEY, JSON.stringify({ ...template, draftSavedAt: new Date().toISOString() }));
}
