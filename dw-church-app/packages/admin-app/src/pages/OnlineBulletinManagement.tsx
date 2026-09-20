import { useState } from 'react';
import type { OnlineBulletin, OnlineBulletinContent, OnlineHymn, ListParams, PostStatus } from '@dw-church/api-client';
import {
  useOnlineBulletins,
  useCreateOnlineBulletin,
  useUpdateOnlineBulletin,
  useDeleteOnlineBulletin,
  useDWChurchClient,
} from '@dw-church/api-client';
import { FormField, FormSection, FormRow, inputClass, selectClass, MultiImageUpload, useToast, ConfirmDialog, EmptyState, TableSkeleton } from '../components';

// 온라인 주보 관리 — 문서 주보(BulletinManagement)와 별개. content(jsonb) 한 건에
// 예배순서·찬양악보·대표기도·교회소식·성경본문·기도제목·마지막찬양·소그룹질문을 입력.
// 스크롤 순서(사이트 표시와 동일): 예배순서 → 찬양악보 → 대표기도 → 교회소식 →
// 성경본문 → 기도제목 → 마지막찬양 → 소그룹 나눔 질문.
// 성경본문(개역개정/ESV)·기도제목·소그룹질문은 한/영 병기 + 자동번역 지원.

const EMPTY_HYMN: OnlineHymn = { title: '', hymnNo: '', imageUrls: [], note: '', lyrics: '' };
const EMPTY_CONTENT: OnlineBulletinContent = {
  serviceTitle: '주일예배',
  presider: '',
  worshipOrder: [],
  hymns: [],
  representativePrayer: { person: '', content: '' },
  announcements: [],
  scripture: { reference: '', text: '', referenceEn: '', textEn: '' },
  prayerRequests: [],
  closingHymn: { ...EMPTY_HYMN },
  study: { observation: [], correlation: [], application: [], observationEn: [], correlationEn: [], applicationEn: [] },
};

interface FormState { title: string; serviceDate: string; status: PostStatus; content: OnlineBulletinContent }
const EMPTY_FORM: FormState = { title: '', serviceDate: '', status: 'published', content: structuredClone(EMPTY_CONTENT) };

const btnGhost = 'text-sm text-blue-600 hover:underline';
const btnDelRow = 'text-red-500 hover:text-red-700 text-sm shrink-0';
const btnAiClass = 'inline-flex items-center gap-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-50 disabled:opacity-50';

// 설교 노트 입력 도움용 서식 예시(스크린샷 스타일). 사이트에서 제목/소제목/불릿/인용으로 렌더.
const SERMON_PLACEHOLDER = `# 요한복음 5장을 통해 우리에게 주시는 교훈

## 1. 잘못된 종교적 신념과 가치관, 우리의 신앙은 어떤가?

**본문**
요한복음 5:6-7
> 6 예수께서 그 누운 것을 보시고 병이 벌써 오래된 줄 아시고 이르시되 네가 낫고자 하느냐
> 7 병자가 대답하되 주여 물이 움직일 때에 나를 못에 넣어 주는 사람이 없어...

**예화**
- 밤에 휘파람을 불면 안 된다.
- 밤에 손톱을 깎으면 안 된다.

**핵심 질문**
내 신앙 안에 들어와 굳어진 잘못된 신앙, 가치관, 신념은 없는가?

**핵심 내용**
- 잘못된 신념과 가치관으로 굳어진 신앙은 우리의 믿음을 해칠 수 있다.`;

// 어린이 설교 노트 서식 예시(구분선 --- , 번호목록 1. 지원).
const CHILDREN_SERMON_PLACEHOLDER = `# 요한복음 5장

## 예수님을 바라보아요

### 중심 말씀
**요한복음 5:24**
"내 말을 듣고 또 나 보내신 이를 믿는 자는 영생을 얻었고…"

### 오늘의 중심 메시지
**내 생각이나 사람, 어려운 상황보다 예수님을 바라보아요.**

---

# 1. 내 생각보다 예수님의 말씀을 믿어요

### 어린이들에게
- "나는 원래 이것을 못해."
- "저 친구는 절대 안 변해."

### 적용
**"예수님이라면 내가 어떻게 하기를 원하실까?"**

# 함께 생각해 보기
1. 내가 요즘 고집하고 있는 생각은 무엇인가요?
2. 나를 속상하게 만든 친구에게 어떻게 행동해야 할까요?`;

export default function OnlineBulletinManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [params, setParams] = useState<ListParams>({ page: 1, perPage: 10, search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState<string | null>(null); // 'scripture' | 'prayers' | 'study'

  const { showToast } = useToast();
  const apiClient = useDWChurchClient();
  const uploadImage = async (file: File): Promise<string> => (await apiClient!.uploadFile(file, 'online-bulletins')).url;
  const { data, isLoading, error } = useOnlineBulletins(params);
  const createMutation = useCreateOnlineBulletin();
  const updateMutation = useUpdateOnlineBulletin();
  const deleteMutation = useDeleteOnlineBulletin();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── content mutation helpers ──
  const c = form.content;
  const setContent = (patch: Partial<OnlineBulletinContent>) => setForm((f) => ({ ...f, content: { ...f.content, ...patch } }));
  const wo = c.worshipOrder ?? [];
  const hymns = c.hymns ?? [];
  const prayers = c.prayerRequests ?? [];
  const anns = c.announcements ?? [];
  const study = c.study ?? { observation: [], correlation: [], application: [] };

  // ── AI helpers (자동번역 · 성경 · 가사 스캔) ──
  // 원문(한국어)→영어 일괄 번역. 반환 {원문: 번역문}. 크레딧/키 없으면 원문 유지(무손상).
  const translateMany = async (texts: string[]): Promise<Record<string, string>> => {
    const clean = Array.from(new Set(texts.map((t) => (t || '').trim()).filter(Boolean)));
    if (clean.length === 0 || !apiClient) return {};
    return apiClient.translate(clean, 'en');
  };

  const fetchScripture = async () => {
    const ref = (c.scripture?.reference ?? '').trim();
    if (!ref) { showToast('error', '먼저 성경 장절(예: 누가복음 1:46-55)을 입력하세요.'); return; }
    setBusy('scripture');
    try {
      const r = await apiClient!.fetchScripture(ref);
      if (!r.ko && !r.en) { showToast('error', '본문을 가져오지 못했습니다. 직접 입력해주세요.'); return; }
      setContent({
        scripture: {
          reference: ref,
          referenceEn: r.referenceEn || c.scripture?.referenceEn || '',
          text: r.ko || c.scripture?.text || '',
          textEn: r.en || c.scripture?.textEn || '',
        },
      });
      showToast('success', '개역개정·ESV 본문을 가져왔습니다. 게시 전 확인/교정하세요.');
    } catch { showToast('error', '오류가 발생했습니다.'); }
    finally { setBusy(null); }
  };

  const translatePrayers = async () => {
    if (prayers.length === 0) { showToast('error', '먼저 기도 제목을 입력하세요.'); return; }
    setBusy('prayers');
    try {
      const map = await translateMany(prayers.flatMap((p) => [p.title, p.detail]));
      setContent({
        prayerRequests: prayers.map((p) => ({
          ...p,
          titleEn: p.title?.trim() ? (map[p.title.trim()] ?? p.titleEn ?? '') : '',
          detailEn: p.detail?.trim() ? (map[p.detail.trim()] ?? p.detailEn ?? '') : '',
        })),
      });
      showToast('success', '기도 제목을 영어로 번역했습니다. 확인해주세요.');
    } catch { showToast('error', '번역에 실패했습니다.'); }
    finally { setBusy(null); }
  };

  const translateStudy = async () => {
    const keys = ['observation', 'correlation', 'application'] as const;
    const all = keys.flatMap((k) => study[k] ?? []);
    if (!all.some((q) => (q || '').trim())) { showToast('error', '먼저 나눔 질문을 입력하세요.'); return; }
    setBusy('study');
    try {
      const map = await translateMany(all);
      const next = { ...study } as NonNullable<OnlineBulletinContent['study']>;
      for (const k of keys) {
        (next as Record<string, unknown>)[`${k}En`] = (study[k] ?? []).map((q) => (q?.trim() ? (map[q.trim()] ?? '') : ''));
      }
      setContent({ study: next });
      showToast('success', '나눔 질문을 영어로 번역했습니다. 확인해주세요.');
    } catch { showToast('error', '번역에 실패했습니다.'); }
    finally { setBusy(null); }
  };

  // 설교 노트 / 어린이 설교 노트 공용 번역 핸들러(동일 구조).
  const translateNote = async (field: 'sermonNote' | 'childrenSermonNote') => {
    const text = (c[field]?.text ?? '').trim();
    if (!text) { showToast('error', '먼저 노트(한국어)를 입력하세요.'); return; }
    setBusy(field);
    try {
      const map = await translateMany([text]);
      const enText = map[text] ?? '';
      if (!enText) { showToast('error', '번역에 실패했습니다. 직접 입력해주세요.'); return; }
      setContent({ [field]: { ...(c[field] ?? {}), text, textEn: enText } } as Partial<OnlineBulletinContent>);
      showToast('success', '영어로 번역했습니다. 확인해주세요.');
    } catch { showToast('error', '번역에 실패했습니다.'); }
    finally { setBusy(null); }
  };

  // 악보 이미지 → 가사 OCR. 성공 시 lyrics 문자열 반환(HymnEditor 가 필드에 채움).
  const scanLyrics = async (urls: string[]): Promise<string> => {
    try {
      const text = await apiClient!.scanHymnLyrics(urls);
      if (text) showToast('success', '가사를 스캔했습니다. 게시 전 확인/교정하세요.');
      else showToast('error', '가사를 인식하지 못했습니다. 직접 입력해주세요.');
      return text;
    } catch { showToast('error', '스캔에 실패했습니다.'); return ''; }
  };

  const handleCreate = () => { setEditingId(null); setForm(structuredClone(EMPTY_FORM)); setView('edit'); };
  const handleEdit = (item: OnlineBulletin) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      serviceDate: item.serviceDate ? String(item.serviceDate).slice(0, 10) : '',
      status: item.status,
      // Merge over EMPTY_CONTENT so older/partial rows still have every field.
      content: { ...structuredClone(EMPTY_CONTENT), ...(item.content ?? {}) },
    });
    setView('edit');
  };

  const onSubmit = () => {
    if (!form.title.trim()) { showToast('error', '제목을 입력하세요.'); return; }
    if (!form.serviceDate) { showToast('error', '예배일을 선택하세요.'); return; }
    const payload = { title: form.title, serviceDate: form.serviceDate, status: form.status, content: form.content };
    const done = { onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); }, onError: () => showToast('error', '오류가 발생했습니다.') };
    if (editingId) updateMutation.mutate({ id: editingId, data: payload }, done);
    else createMutation.mutate(payload as Omit<OnlineBulletin, 'id' | 'createdAt' | 'updatedAt'>, done);
  };

  // ── EDIT VIEW ──
  if (view === 'edit') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button type="button" onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            목록으로
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{editingId ? '온라인 주보 수정' : '온라인 주보 작성'}</h2>
          <p className="text-sm text-gray-500 mt-1">아래 순서대로 입력하면 사이트에서 스크롤 다운으로 표시됩니다. 성경 본문·기도 제목·소그룹 질문은 한/영을 함께 넣으면 사이트에 한/영 전환 버튼이 나옵니다.</p>
        </div>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <FormSection title="기본 정보">
            <FormRow>
              <FormField label="제목" required>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="예: 2026년 12월 25일 성탄주일예배" className={inputClass} />
              </FormField>
              <FormField label="상태">
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PostStatus }))} className={selectClass}>
                  <option value="published">공개</option>
                  <option value="draft">임시저장</option>
                  <option value="archived">보관</option>
                </select>
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="예배일" required>
                <input type="date" value={form.serviceDate} onChange={(e) => setForm((f) => ({ ...f, serviceDate: e.target.value }))} className={inputClass} />
              </FormField>
              <FormField label="예배명">
                <input value={c.serviceTitle ?? ''} onChange={(e) => setContent({ serviceTitle: e.target.value })} placeholder="주일예배" className={inputClass} />
              </FormField>
            </FormRow>
            <FormField label="인도 (예배 인도자)">
              <input value={c.presider ?? ''} onChange={(e) => setContent({ presider: e.target.value })} placeholder="예: 곽정민 목사" className={inputClass} />
            </FormField>
          </FormSection>

          {/* 1. 예배 순서 */}
          <FormSection title="1. 예배 순서">
            <div className="space-y-2">
              {wo.map((r, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input value={r.label} onChange={(e) => setContent({ worshipOrder: wo.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x) })} placeholder="순서 (예: 찬양)" className={`${inputClass} w-32`} />
                  <input value={r.detail} onChange={(e) => setContent({ worshipOrder: wo.map((x, idx) => idx === i ? { ...x, detail: e.target.value } : x) })} placeholder="내용 (예: 찬121 우리 구주 나신 날)" className={`${inputClass} flex-1`} />
                  <input value={r.person} onChange={(e) => setContent({ worshipOrder: wo.map((x, idx) => idx === i ? { ...x, person: e.target.value } : x) })} placeholder="담당 (예: 인도자)" className={`${inputClass} w-32`} />
                  <button type="button" onClick={() => setContent({ worshipOrder: wo.filter((_, idx) => idx !== i) })} className={`${btnDelRow} pt-2`}>삭제</button>
                </div>
              ))}
              <button type="button" onClick={() => setContent({ worshipOrder: [...wo, { label: '', detail: '', person: '' }] })} className={btnGhost}>+ 순서 추가</button>
            </div>
          </FormSection>

          {/* 2. 찬양 악보 */}
          <FormSection title="2. 찬양 악보">
            <div className="space-y-4">
              {hymns.map((h, i) => (
                <HymnEditor key={i} hymn={h} onChange={(patch) => setContent({ hymns: hymns.map((x, idx) => idx === i ? { ...x, ...patch } : x) })} onRemove={() => setContent({ hymns: hymns.filter((_, idx) => idx !== i) })} uploadImage={uploadImage} scanLyrics={scanLyrics} />
              ))}
              <button type="button" onClick={() => setContent({ hymns: [...hymns, { ...EMPTY_HYMN }] })} className={btnGhost}>+ 찬양 추가</button>
            </div>
          </FormSection>

          {/* 3. 대표기도 */}
          <FormSection title="3. 대표기도">
            <FormField label="기도자">
              <input value={c.representativePrayer?.person ?? ''} onChange={(e) => setContent({ representativePrayer: { ...(c.representativePrayer ?? { person: '', content: '' }), person: e.target.value } })} placeholder="예: 김집사" className={inputClass} />
            </FormField>
            <FormField label="기도 내용 / 메모 (선택)">
              <textarea value={c.representativePrayer?.content ?? ''} onChange={(e) => setContent({ representativePrayer: { ...(c.representativePrayer ?? { person: '', content: '' }), content: e.target.value } })} rows={3} className={inputClass} />
            </FormField>
          </FormSection>

          {/* 4. 교회소식 (구 주일광고 — 대표기도 다음) */}
          <FormSection title="4. 교회소식">
            <div className="space-y-2">
              {anns.map((a, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input value={a.title} onChange={(e) => setContent({ announcements: anns.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x) })} placeholder="제목" className={`${inputClass} w-48`} />
                  <textarea value={a.body} onChange={(e) => setContent({ announcements: anns.map((x, idx) => idx === i ? { ...x, body: e.target.value } : x) })} placeholder="내용" rows={2} className={`${inputClass} flex-1`} />
                  <button type="button" onClick={() => setContent({ announcements: anns.filter((_, idx) => idx !== i) })} className={`${btnDelRow} pt-2`}>삭제</button>
                </div>
              ))}
              <button type="button" onClick={() => setContent({ announcements: [...anns, { title: '', body: '' }] })} className={btnGhost}>+ 소식 추가</button>
            </div>
          </FormSection>

          {/* 5. 성경 본문 (개역개정 / ESV) */}
          <FormSection title="5. 성경 본문 (한국어 개역개정 · 영어 ESV)">
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <FormField label="본문 (장절)">
                  <input value={c.scripture?.reference ?? ''} onChange={(e) => setContent({ scripture: { ...(c.scripture ?? { reference: '', text: '' }), reference: e.target.value } })} placeholder="예: 누가복음 1:46-55" className={inputClass} />
                </FormField>
              </div>
              <button type="button" onClick={fetchScripture} disabled={busy === 'scripture'} className={`${btnAiClass} mb-1`}>
                {busy === 'scripture' ? '가져오는 중…' : '📖 본문 가져오기 (개역개정·ESV)'}
              </button>
            </div>
            <p className="text-xs text-gray-500 -mt-2 mb-3">장절을 넣고 버튼을 누르면 개역개정·ESV 본문이 자동으로 채워집니다. AI가 채우므로 게시 전 반드시 확인/교정하세요.</p>
            <FormField label="영어 장절 (English reference)">
              <input value={c.scripture?.referenceEn ?? ''} onChange={(e) => setContent({ scripture: { ...(c.scripture ?? { reference: '', text: '' }), referenceEn: e.target.value } })} placeholder="예: Luke 1:46-55" className={inputClass} />
            </FormField>
            <FormRow>
              <FormField label="본문 · 한국어 (개역개정)">
                <textarea value={c.scripture?.text ?? ''} onChange={(e) => setContent({ scripture: { ...(c.scripture ?? { reference: '', text: '' }), text: e.target.value } })} rows={8} placeholder="개역개정 본문" className={inputClass} />
              </FormField>
              <FormField label="본문 · 영어 (ESV)">
                <textarea value={c.scripture?.textEn ?? ''} onChange={(e) => setContent({ scripture: { ...(c.scripture ?? { reference: '', text: '' }), textEn: e.target.value } })} rows={8} placeholder="ESV text" className={inputClass} />
              </FormField>
            </FormRow>
          </FormSection>

          {/* 6. 설교 노트 (한/영) — 성경 본문 아래 */}
          <FormSection title="6. 설교 노트">
            <div className="flex items-center justify-between -mt-1 mb-2 gap-2">
              <p className="text-xs text-gray-500"># 제목, ## 소제목, **강조**, - 불릿, &gt; 인용 서식을 쓰면 사이트에 정리된 문서로 표시됩니다.</p>
              <button type="button" onClick={() => translateNote('sermonNote')} disabled={busy === 'sermonNote'} className={`${btnAiClass} shrink-0`}>
                {busy === 'sermonNote' ? '번역 중…' : '🌐 영어 자동번역'}
              </button>
            </div>
            <FormField label="설교 제목 (선택)">
              <input value={c.sermonNote?.title ?? ''} onChange={(e) => setContent({ sermonNote: { ...(c.sermonNote ?? {}), title: e.target.value } })} placeholder="예: 요한복음 5장을 통해 우리에게 주시는 교훈" className={inputClass} />
            </FormField>
            <FormRow>
              <FormField label="설교 노트 · 한국어">
                <textarea value={c.sermonNote?.text ?? ''} onChange={(e) => setContent({ sermonNote: { ...(c.sermonNote ?? {}), text: e.target.value } })} rows={16} placeholder={SERMON_PLACEHOLDER} className={`${inputClass} font-mono text-sm`} />
              </FormField>
              <FormField label="설교 노트 · English">
                <textarea value={c.sermonNote?.textEn ?? ''} onChange={(e) => setContent({ sermonNote: { ...(c.sermonNote ?? {}), textEn: e.target.value } })} rows={16} placeholder="English sermon note (markdown)" className={`${inputClass} font-mono text-sm`} />
              </FormField>
            </FormRow>
          </FormSection>

          {/* 7. 어린이 설교 노트 (한/영) — 성인 설교 노트 다음 */}
          <FormSection title="7. 어린이 설교 노트">
            <div className="flex items-center justify-between -mt-1 mb-2 gap-2">
              <p className="text-xs text-gray-500">어린이 눈높이 설교 정리 — 성인 설교 노트와 동일한 서식(# 제목, ## 소제목, ### 소소제목, **강조**, - 불릿, 1. 번호, --- 구분선, &gt; 인용).</p>
              <button type="button" onClick={() => translateNote('childrenSermonNote')} disabled={busy === 'childrenSermonNote'} className={`${btnAiClass} shrink-0`}>
                {busy === 'childrenSermonNote' ? '번역 중…' : '🌐 영어 자동번역'}
              </button>
            </div>
            <FormField label="어린이 설교 제목 (선택)">
              <input value={c.childrenSermonNote?.title ?? ''} onChange={(e) => setContent({ childrenSermonNote: { ...(c.childrenSermonNote ?? {}), title: e.target.value } })} placeholder="예: 예수님을 바라보아요" className={inputClass} />
            </FormField>
            <FormRow>
              <FormField label="어린이 설교 노트 · 한국어">
                <textarea value={c.childrenSermonNote?.text ?? ''} onChange={(e) => setContent({ childrenSermonNote: { ...(c.childrenSermonNote ?? {}), text: e.target.value } })} rows={16} placeholder={CHILDREN_SERMON_PLACEHOLDER} className={`${inputClass} font-mono text-sm`} />
              </FormField>
              <FormField label="어린이 설교 노트 · English">
                <textarea value={c.childrenSermonNote?.textEn ?? ''} onChange={(e) => setContent({ childrenSermonNote: { ...(c.childrenSermonNote ?? {}), textEn: e.target.value } })} rows={16} placeholder="English children's sermon note (markdown)" className={`${inputClass} font-mono text-sm`} />
              </FormField>
            </FormRow>
          </FormSection>

          {/* 8. 기도 제목 (한/영) */}
          <FormSection title="8. 기도 제목">
            <div className="flex items-center justify-end -mt-1 mb-2">
              <button type="button" onClick={translatePrayers} disabled={busy === 'prayers'} className={btnAiClass}>
                {busy === 'prayers' ? '번역 중…' : '🌐 영어 자동번역 (한글 → 영어)'}
              </button>
            </div>
            <div className="space-y-3">
              {prayers.map((p, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">기도 제목 {i + 1}</span>
                    <button type="button" onClick={() => setContent({ prayerRequests: prayers.filter((_, idx) => idx !== i) })} className={btnDelRow}>삭제</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-gray-400">한국어</p>
                      <input value={p.title} onChange={(e) => setContent({ prayerRequests: prayers.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x) })} placeholder="제목" className={inputClass} />
                      <input value={p.detail} onChange={(e) => setContent({ prayerRequests: prayers.map((x, idx) => idx === i ? { ...x, detail: e.target.value } : x) })} placeholder="내용" className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-gray-400">English</p>
                      <input value={p.titleEn ?? ''} onChange={(e) => setContent({ prayerRequests: prayers.map((x, idx) => idx === i ? { ...x, titleEn: e.target.value } : x) })} placeholder="Title" className={inputClass} />
                      <input value={p.detailEn ?? ''} onChange={(e) => setContent({ prayerRequests: prayers.map((x, idx) => idx === i ? { ...x, detailEn: e.target.value } : x) })} placeholder="Detail" className={inputClass} />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setContent({ prayerRequests: [...prayers, { title: '', detail: '' }] })} className={btnGhost}>+ 기도 제목 추가</button>
            </div>
          </FormSection>

          {/* 9. 마지막 찬양 */}
          <FormSection title="9. 마지막 찬양">
            <HymnEditor hymn={c.closingHymn ?? { ...EMPTY_HYMN }} onChange={(patch) => setContent({ closingHymn: { ...(c.closingHymn ?? EMPTY_HYMN), ...patch } })} uploadImage={uploadImage} scanLyrics={scanLyrics} />
          </FormSection>

          {/* 10. 소그룹 나눔 질문 (한/영) */}
          <FormSection title="10. 소그룹 나눔 질문 (본문 연계)">
            <div className="flex items-center justify-between -mt-1 mb-2 gap-2">
              <p className="text-xs text-gray-500">성경 본문과 연결된 관찰·상관·적용 질문 — 소그룹에서 사용합니다.</p>
              <button type="button" onClick={translateStudy} disabled={busy === 'study'} className={`${btnAiClass} shrink-0`}>
                {busy === 'study' ? '번역 중…' : '🌐 영어 자동번역'}
              </button>
            </div>
            <BilingualQuestionList label="관찰 질문" items={study.observation ?? []} itemsEn={study.observationEn ?? []} onChange={(ko, en) => setContent({ study: { ...study, observation: ko, observationEn: en } })} />
            <BilingualQuestionList label="상관 질문" items={study.correlation ?? []} itemsEn={study.correlationEn ?? []} onChange={(ko, en) => setContent({ study: { ...study, correlation: ko, correlationEn: en } })} />
            <BilingualQuestionList label="적용 질문" items={study.application ?? []} itemsEn={study.applicationEn ?? []} onChange={(ko, en) => setContent({ study: { ...study, application: ko, applicationEn: en } })} />
          </FormSection>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setView('list')} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900">취소</button>
            <button type="button" onClick={onSubmit} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 text-sm font-medium disabled:opacity-50 shadow-sm">
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">온라인 주보 관리</h2>
        <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium">새 온라인 주보</button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="검색..." value={params.search || ''} onChange={(e) => setParams((p) => ({ ...p, search: e.target.value, page: 1 }))} className="border rounded px-3 py-2 w-full sm:w-64" />
      </div>

      {isLoading && <TableSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {data && data.data.length === 0 && !isLoading && (
        <EmptyState icon="📜" title="등록된 온라인 주보가 없습니다" description="새 온라인 주보를 작성해보세요." actionLabel="온라인 주보 작성" onAction={handleCreate} />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-sm font-medium">예배일</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">제목</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.serviceDate ? String(item.serviceDate).slice(0, 10) : '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{item.title}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{item.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:underline">편집</button>
                      <button onClick={() => setDeleteTarget({ id: item.id, name: item.title || '' })} disabled={deleteMutation.isPending} className="text-red-600 hover:underline disabled:opacity-50">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">총 {data.total}건 (페이지 {data.page}/{data.totalPages})</span>
            <div className="flex gap-2">
              <button disabled={data.page <= 1} onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) - 1 }))} className="px-3 py-1 border rounded disabled:opacity-50">이전</button>
              <button disabled={data.page >= data.totalPages} onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) + 1 }))} className="px-3 py-1 border rounded disabled:opacity-50">다음</button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name}"을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget!.id, { onSuccess: () => showToast('success', '삭제되었습니다.'), onError: () => showToast('error', '오류가 발생했습니다.') });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ── sub-editors ── */
function HymnEditor({ hymn, onChange, onRemove, uploadImage, scanLyrics }: { hymn: OnlineHymn; onChange: (patch: Partial<OnlineHymn>) => void; onRemove?: () => void; uploadImage: (f: File) => Promise<string>; scanLyrics: (urls: string[]) => Promise<string> }) {
  const [scanning, setScanning] = useState(false);
  const imageUrls = hymn.imageUrls || [];
  const doScan = async () => {
    if (imageUrls.length === 0 || scanning) return;
    setScanning(true);
    try {
      const text = await scanLyrics(imageUrls);
      if (text) onChange({ lyrics: text }); // 스캔 결과로 가사 필드 채움(악보 아래 표시)
    } finally { setScanning(false); }
  };
  return (
    <div className="rounded-lg border border-gray-200 p-3 space-y-2">
      <div className="flex gap-2 items-start">
        <input value={hymn.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="찬양 제목 (예: 우리 구주 나신 날)" className={`${inputClass} flex-1`} />
        <input value={hymn.hymnNo} onChange={(e) => onChange({ hymnNo: e.target.value })} placeholder="장 (예: 찬121)" className={`${inputClass} w-28`} />
        {onRemove && <button type="button" onClick={onRemove} className={`${btnDelRow} pt-2`}>삭제</button>}
      </div>
      <MultiImageUpload value={imageUrls} onChange={(urls) => onChange({ imageUrls: urls })} onUpload={uploadImage} resize="content" max={6} label="악보 이미지" />
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-gray-700">가사 (악보 아래 표시 — 모바일 대비)</label>
        <button type="button" onClick={doScan} disabled={imageUrls.length === 0 || scanning} className={btnAiClass} title={imageUrls.length === 0 ? '먼저 악보 이미지를 업로드하세요' : '악보에서 가사를 인식합니다'}>
          {scanning ? '스캔 중…' : '🔎 악보에서 가사 스캔'}
        </button>
      </div>
      <textarea value={hymn.lyrics ?? ''} onChange={(e) => onChange({ lyrics: e.target.value })} rows={5} placeholder="가사 (직접 입력하거나 '악보에서 가사 스캔'을 눌러 채우기)" className={inputClass} />
      <input value={hymn.note} onChange={(e) => onChange({ note: e.target.value })} placeholder="메모 (선택)" className={inputClass} />
    </div>
  );
}

// 관찰/상관/적용 질문 — 한/영 병기. items(한글)·itemsEn(영어)를 같은 인덱스로 짝지어 관리.
function BilingualQuestionList({ label, items, itemsEn, onChange }: { label: string; items: string[]; itemsEn: string[]; onChange: (items: string[], itemsEn: string[]) => void }) {
  const ko = items ?? [];
  const en = itemsEn ?? [];
  const enAt = (i: number) => en[i] ?? '';
  const setKo = (i: number, v: string) => onChange(ko.map((x, idx) => idx === i ? v : x), ko.map((_, idx) => idx === i ? enAt(i) : enAt(idx)));
  const setEn = (i: number, v: string) => onChange(ko, ko.map((_, idx) => idx === i ? v : enAt(idx)));
  const add = () => onChange([...ko, ''], [...ko.map((_, i) => enAt(i)), '']);
  const remove = (i: number) => onChange(ko.filter((_, idx) => idx !== i), ko.map((_, idx) => enAt(idx)).filter((_, idx) => idx !== i));
  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>
      <div className="space-y-2">
        {ko.map((q, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-xs text-gray-400 font-mono pt-2.5 w-5 shrink-0">{i + 1}.</span>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
              <textarea value={q} onChange={(e) => setKo(i, e.target.value)} rows={2} placeholder="질문 (한국어)" className={inputClass} />
              <textarea value={enAt(i)} onChange={(e) => setEn(i, e.target.value)} rows={2} placeholder="Question (English)" className={inputClass} />
            </div>
            <button type="button" onClick={() => remove(i)} className={`${btnDelRow} pt-2`}>삭제</button>
          </div>
        ))}
        <button type="button" onClick={add} className={btnGhost}>+ {label} 추가</button>
      </div>
    </div>
  );
}
