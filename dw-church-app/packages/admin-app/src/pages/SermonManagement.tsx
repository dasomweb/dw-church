import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { Sermon, SermonListParams, PostStatus, SermonBodySection } from '@dw-church/api-client';
import {
  useSermons,
  useCreateSermon,
  useUpdateSermon,
  useDeleteSermon,
  useSermonCategories,
  useSermonPreachers,
  useDWChurchClient,
} from '@dw-church/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { FormField, inputClass, selectClass, textareaClass, useToast, ConfirmDialog, EmptyState, TableSkeleton, CategoryManager, ImageUpload } from '../components';
import YoutubeImportButton from '../components/YoutubeImportButton';
import { useBulkDelete } from '../components/useBulkDelete';

// ─── YouTube 유틸 ──────────────────────────────────
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|\/live\/|\/embed\/|\/shorts\/|\/v\/|youtu\.be\/)([0-9A-Za-z_-]{11})/);
  return match?.[1] ?? null;
}
function normalizeYoutubeUrl(url: string): string {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : url;
}
const YOUTUBE_THUMB_PRIORITY = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'] as const;
function getYouTubeThumbnailUrl(videoId: string, quality = 'maxresdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

const EMPTY_SECTION: SermonBodySection = { subtitle: '', body: '', imageUrl: '', caption: '', alt: '' };
const SERVICE_TYPES = ['주일설교', '수요예배', '새벽기도', '금요기도회', '특별집회', '주일오후'];

interface SermonFormData {
  title: string;
  scripture: string;
  preacher: string;
  date: string;
  status: PostStatus;
  youtubeUrl: string;
  thumbnailUrl: string;
  serviceType: string;
  series: string;
  scheduledAt: string;
  seoSummary: string;
}

// ─── 카드 래퍼 ──────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}>{children}</div>;
}

// ─── 간이 서식 입력 (B/기울임/인용/구절삽입/링크) — 마크다운-라이트 저장 ──────
// 저장 형식: **굵게** *기울임* > 인용 [텍스트](URL). 스토어프론트가 동일 규칙으로 렌더.
function RichArea({ inputRef, value, onChange, placeholder, rows = 8, showLink = false, headerAction }: {
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; showLink?: boolean; headerAction?: React.ReactNode;
}) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? localRef;
  const apply = (make: (sel: string, v: string, s: number, e: number) => { text: string; ns: number; ne: number }) => {
    const el = ref.current; if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const { text, ns, ne } = make(value.slice(s, e), value, s, e);
    onChange(text);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(ns, ne); });
  };
  const wrap = (b: string, a: string) => apply((sel, v, s, e) => ({ text: v.slice(0, s) + b + sel + a + v.slice(e), ns: s + b.length, ne: e + b.length }));
  const prefixLines = (p: string) => apply((sel, v, s, e) => {
    const ls = v.lastIndexOf('\n', s - 1) + 1;
    const nl = v.indexOf('\n', e); const le = nl === -1 ? v.length : nl;
    const block = v.slice(ls, le).split('\n').map((l) => (l.startsWith(p) ? l : p + l)).join('\n');
    return { text: v.slice(0, ls) + block + v.slice(le), ns: ls, ne: ls + block.length };
  });
  const bold = () => wrap('**', '**');
  const italic = () => wrap('*', '*');
  const quote = () => prefixLines('> ');
  const link = () => { const u = window.prompt('링크 URL을 입력하세요', 'https://'); if (u) wrap('[', `](${u})`); };
  const verse = () => {
    const r = window.prompt('성경 구절 (예: 요한복음 3:16)');
    if (!r) return;
    apply((_sel, v, s) => { const ins = (s > 0 && v[s - 1] !== '\n' ? '\n' : '') + `> ${r}\n`; return { text: v.slice(0, s) + ins + v.slice(s), ns: s + ins.length, ne: s + ins.length }; });
  };
  const btn = 'text-sm text-gray-500 hover:text-gray-900';
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-3 py-2">
        <div className="flex items-center gap-4">
          <button type="button" onClick={bold} className={`${btn} font-bold`}>B</button>
          <button type="button" onClick={italic} className={`${btn} italic`}>/</button>
          <button type="button" onClick={quote} className={btn}>인용</button>
          <button type="button" onClick={verse} className={btn}>구절 삽입</button>
          {showLink && <button type="button" onClick={link} className={btn}>링크</button>}
        </div>
        {headerAction}
      </div>
      <textarea
        ref={ref} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full resize-y border-0 px-4 py-3 text-[15px] leading-[1.8] focus:outline-none focus:ring-0"
      />
    </div>
  );
}

export default function SermonManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Sermon | null>(null);
  const [tab, setTab] = useState<'basic' | 'manuscript' | 'layout'>('basic');
  const EMPTY_STUDY = { oneLineSummary: '', summary: '', observation: [] as string[], deep: [] as string[], application: [] as string[] };
  const [study, setStudy] = useState(EMPTY_STUDY);
  const [studyOpen, setStudyOpen] = useState(false);
  const [manuscript, setManuscript] = useState('');
  const manuscriptRef = useRef<HTMLTextAreaElement>(null);
  const [sections, setSections] = useState<SermonBodySection[]>([{ ...EMPTY_SECTION }]);
  const [activeSec, setActiveSec] = useState(0);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [params, setParams] = useState<SermonListParams>({ page: 1, perPage: 10, search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { showToast } = useToast();
  const { data, isLoading, error, refetch } = useSermons(params);
  const { data: categories } = useSermonCategories();
  const { data: preachers } = useSermonPreachers();
  const createMutation = useCreateSermon();
  const updateMutation = useUpdateSermon();
  const deleteMutation = useDeleteSermon();
  const bulk = useBulkDelete<Sermon>({ deleteOne: (id) => deleteMutation.mutateAsync(id), onDone: () => refetch() });
  const apiClient = useDWChurchClient();
  const queryClient = useQueryClient();

  const [newPreacherOpen, setNewPreacherOpen] = useState(false);
  const [newPreacherName, setNewPreacherName] = useState('');
  const [savingPreacher, setSavingPreacher] = useState(false);
  const [catManagerOpen, setCatManagerOpen] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SermonFormData>();

  // YouTube URL → 대표 이미지 자동(비어 있을 때만)
  const youtubeUrl = watch('youtubeUrl') || '';
  const thumbnailUrl = watch('thumbnailUrl') || '';
  const videoId = extractYouTubeId(youtubeUrl);
  useEffect(() => {
    if (!videoId || thumbnailUrl) return;
    let cancelled = false;
    const probe = (key: string): Promise<boolean> => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(!(img.naturalWidth === 120 && img.naturalHeight === 90));
      img.onerror = () => resolve(false);
      img.src = getYouTubeThumbnailUrl(videoId, key);
    });
    (async () => {
      for (const key of YOUTUBE_THUMB_PRIORITY) {
        const ok = await probe(key);
        if (cancelled) return;
        if (ok) { setValue('thumbnailUrl', getYouTubeThumbnailUrl(videoId, key), { shouldDirty: true }); return; }
      }
    })();
    return () => { cancelled = true; };
  }, [videoId, thumbnailUrl, setValue]);

  const uploadImage = async (file: File): Promise<string> => (await apiClient!.uploadFile(file, 'sermons')).url;

  const handleSavePreacher = async () => {
    const name = newPreacherName.trim();
    if (!name || savingPreacher) return;
    setSavingPreacher(true);
    try {
      await apiClient!.adapter.post<{ data: { id: string; name: string } }>('/api/v1/preachers', { name });
      await queryClient.invalidateQueries({ queryKey: ['taxonomies', 'sermon_preacher'] });
      setValue('preacher', name);
      setNewPreacherName('');
      setNewPreacherOpen(false);
      showToast('success', `설교자 "${name}" 등록됨`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '설교자 등록 실패');
    } finally {
      setSavingPreacher(false);
    }
  };

  const toLocalInput = (iso?: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleEdit = (item: Sermon) => {
    setEditingItem(item);
    setTab('basic');
    reset({
      title: item.title,
      scripture: item.scripture,
      preacher: item.preacher,
      date: item.date ? String(item.date).slice(0, 10) : '',
      status: item.status,
      youtubeUrl: item.youtubeUrl,
      thumbnailUrl: item.thumbnailUrl,
      serviceType: item.serviceType ?? '',
      series: item.series ?? '',
      scheduledAt: toLocalInput(item.scheduledAt),
      seoSummary: item.seoSummary ?? '',
    });
    setStudy({
      oneLineSummary: item.oneLineSummary ?? '',
      summary: item.summary ?? '',
      observation: item.observationQuestions ?? [],
      deep: item.deepQuestions ?? [],
      application: item.applicationQuestions ?? [],
    });
    setStudyOpen((item.observationQuestions?.length ?? 0) + (item.deepQuestions?.length ?? 0) + (item.applicationQuestions?.length ?? 0) > 0 || !!item.summary);
    setManuscript(item.manuscript ?? '');
    setSections((item.body && item.body.length > 0) ? item.body.map((s) => ({ ...EMPTY_SECTION, ...s })) : [{ ...EMPTY_SECTION }]);
    setActiveSec(0);
    setTags(item.tags ?? []);
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    setTab('basic');
    setStudy(EMPTY_STUDY);
    setStudyOpen(false);
    setManuscript('');
    setSections([{ ...EMPTY_SECTION }]);
    setActiveSec(0);
    setTags([]);
    reset({ title: '', scripture: '', preacher: '', date: '', status: 'published', youtubeUrl: '', thumbnailUrl: '', serviceType: '', series: '', scheduledAt: '', seoSummary: '' });
    setView('edit');
  };

  const handleDelete = (item: Sermon) => setDeleteTarget({ id: item.id, name: item.title || '' });

  // ── 지면 구성(단) 조작 ──
  const addSection = () => { setSections((s) => [...s, { ...EMPTY_SECTION }]); setActiveSec(sections.length); };
  const removeSection = (i: number) => {
    setSections((s) => (s.length <= 1 ? [{ ...EMPTY_SECTION }] : s.filter((_, j) => j !== i)));
    setActiveSec((a) => Math.max(0, a >= i ? a - 1 : a));
  };
  const updateSection = (i: number, patch: Partial<SermonBodySection>) =>
    setSections((s) => s.map((sec, j) => (j === i ? { ...sec, ...patch } : sec)));
  const moveSection = (from: number, to: number) => {
    if (from === to || to < 0) return;
    setSections((s) => { const next = [...s]; const [m] = next.splice(from, 1); next.splice(to, 0, m!); return next; });
    setActiveSec(to);
  };
  // 설교 원고에서 선택 영역 → 새 단
  const sendSelectionToNewSection = () => {
    const el = manuscriptRef.current;
    const sel = el ? manuscript.slice(el.selectionStart, el.selectionEnd).trim() : '';
    const text = sel || manuscript.trim();
    if (!text) { showToast('error', '원고에서 보낼 내용을 선택하세요.'); return; }
    setSections((s) => [...s, { ...EMPTY_SECTION, body: text }]);
    setActiveSec(sections.length);
    setTab('layout');
    showToast('success', '선택 영역을 새 단으로 보냈습니다.');
  };
  // 현재 단으로 원고 가져오기(이어붙임)
  const pullManuscriptToSection = () => {
    if (!manuscript.trim()) { showToast('error', '먼저 설교 원고 탭에 원고를 입력하세요.'); return; }
    const cur = sections[activeSec]?.body || '';
    updateSection(activeSec, { body: cur ? `${cur}\n\n${manuscript.trim()}` : manuscript.trim() });
    showToast('success', '원고를 이 단으로 가져왔습니다.');
  };

  const buildPayload = (formData: SermonFormData, status: PostStatus) => ({
    title: formData.title,
    scripture: formData.scripture,
    preacher: formData.preacher,
    date: formData.date,
    // 카테고리 UI 제거 — 편집 시 기존 값 보존, 신규는 빈 배열(예배구분·태그·시리즈로 분류).
    categoryIds: editingItem ? editingItem.categoryIds : [],
    category: '',
    thumbnailUrl: formData.thumbnailUrl,
    youtubeUrl: formData.youtubeUrl,
    status,
    serviceType: formData.serviceType || null,
    series: formData.series || null,
    seoSummary: formData.seoSummary || null,
    scheduledAt: formData.scheduledAt || null,
    tags,
    manuscript,
    body: sections.map((s) => ({ subtitle: s.subtitle || '', body: s.body || '', imageUrl: s.imageUrl || '', caption: s.caption || '', alt: s.alt || '' })),
    // 설교 스터디 (선택 · 매거진/질문지) — 하위호환 유지
    oneLineSummary: study.oneLineSummary,
    summary: study.summary,
    observationQuestions: study.observation,
    deepQuestions: study.deep,
    applicationQuestions: study.application,
  });

  const save = (status: PostStatus) => handleSubmit(
    (formData) => {
      const payload = buildPayload(formData, status);
      const onSuccess = () => { showToast('success', status === 'published' ? '공개되었습니다.' : '임시저장되었습니다.'); setView('list'); };
      const onError = () => showToast('error', '오류가 발생했습니다.');
      if (editingItem) updateMutation.mutate({ id: editingItem.id, data: payload }, { onSuccess, onError });
      else createMutation.mutate(payload, { onSuccess, onError });
    },
    () => { setTab('basic'); showToast('error', '필수 항목(제목·성경 본문·설교자·설교일)을 확인하세요.'); },
  )();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (view === 'edit') {
    const sec = sections[activeSec] ?? sections[0]!;
    const scheduledAt = watch('scheduledAt');
    const statusVal = watch('status');
    const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
      <button type="button" onClick={() => setTab(id)} className={`border-b-2 px-1 pb-2 text-sm font-medium ${tab === id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{label}</button>
    );

    return (
      <div className="admin-content mx-auto max-w-5xl">
        {/* 상단 바 */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <button type="button" onClick={() => setView('list')} className="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              설교 관리
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{editingItem ? '설교 수정' : '설교 작성'}</h2>
            <p className="mt-1 text-sm text-gray-500">원고를 나누어 사진과 함께 읽는 글로 펴냅니다.</p>
          </div>
          <div className="flex gap-2">
            {editingItem && <button type="button" onClick={() => window.open(`/sermons/${editingItem.id}`, '_blank')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">미리보기</button>}
            <button type="button" disabled={isSaving} onClick={() => save('draft')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">임시저장</button>
            <button type="button" disabled={isSaving} onClick={() => save('published')} className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50">공개</button>
          </div>
        </div>

        {/* 탭 */}
        <div className="mb-6 flex gap-6 border-b border-gray-200">
          <TabBtn id="basic" label="기본 정보" />
          <TabBtn id="manuscript" label="설교 원고" />
          <TabBtn id="layout" label="지면 구성" />
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          {/* ── 탭 1: 기본 정보 ── */}
          {tab === 'basic' && (
            <Card>
              <FormField label="제목" required error={errors.title?.message}>
                <input {...register('title', { required: '제목을 입력하세요' })} placeholder="예) 심령이 가난한 자는 복이 있나니" className={inputClass} />
              </FormField>
              <FormField label="성경 본문" required error={errors.scripture?.message}>
                <input {...register('scripture', { required: '성경 본문을 입력하세요' })} placeholder="마태복음 5:1–12" className={inputClass} />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="설교자" required error={errors.preacher?.message}>
                  <div className="flex gap-2">
                    <select {...register('preacher', { required: '설교자를 선택하세요' })} className={`${selectClass} flex-1`}>
                      <option value="">선택하세요</option>
                      {preachers?.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setNewPreacherOpen((v) => !v)} className="whitespace-nowrap rounded-lg border border-indigo-200 bg-indigo-50 px-2 text-xs text-indigo-700 hover:bg-indigo-100">{newPreacherOpen ? '닫기' : '+ 등록'}</button>
                  </div>
                  {newPreacherOpen && (
                    <div className="mt-2 flex gap-2">
                      <input type="text" value={newPreacherName} onChange={(e) => setNewPreacherName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleSavePreacher(); } }} placeholder="예: 김요한 목사" className="flex-1 rounded border border-indigo-300 px-2 py-1 text-sm" autoFocus />
                      <button type="button" onClick={() => void handleSavePreacher()} disabled={!newPreacherName.trim() || savingPreacher} className="rounded bg-indigo-600 px-3 py-1 text-xs text-white disabled:opacity-50">저장</button>
                    </div>
                  )}
                </FormField>
                <FormField label="설교일" required error={errors.date?.message}>
                  <input type="date" {...register('date', { required: '날짜를 선택하세요' })} className={inputClass} />
                </FormField>
                <FormField label="예배 구분">
                  <select {...register('serviceType')} className={selectClass}>
                    <option value="">선택</option>
                    {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormField>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="시리즈">
                  <input {...register('series')} placeholder="예: 마태복음 강해 (선택)" className={inputClass} />
                </FormField>
                <FormField label="태그">
                  <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5">
                    {tags.map((t, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                        {t}<button type="button" onClick={() => setTags((ts) => ts.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600">×</button>
                      </span>
                    ))}
                    <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = tagDraft.trim(); if (v && !tags.includes(v)) setTags((ts) => [...ts, v]); setTagDraft(''); } }}
                      placeholder="+ 추가" className="min-w-[80px] flex-1 border-0 text-sm focus:outline-none focus:ring-0" />
                  </div>
                </FormField>
              </div>
              <FormField label="영상 주소">
                <input {...register('youtubeUrl', { onBlur: (e) => { const clean = normalizeYoutubeUrl(e.target.value); if (clean !== e.target.value) setValue('youtubeUrl', clean, { shouldDirty: true }); } })} placeholder="YouTube / Vimeo URL" className={inputClass} />
                {youtubeUrl && !videoId && <p className="mt-1 text-xs text-red-500">유효한 YouTube URL이 아닙니다.</p>}
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-sm font-medium text-gray-700">대표 이미지</p>
                  <ImageUpload label="" value={thumbnailUrl} onChange={(url) => setValue('thumbnailUrl', url, { shouldDirty: true })} onUpload={uploadImage} resize="content" aspectRatio="4/3" />
                  <p className="mt-1 text-xs text-gray-400">4:3 · 권장 1600×1200. YouTube URL 입력 시 자동 생성.</p>
                  <input type="hidden" {...register('thumbnailUrl')} />
                </div>
                <FormField label="요약">
                  <textarea {...register('seoSummary')} rows={5} placeholder="목록과 검색에 보일 2–3줄 (비워두면 첫 단의 첫 문단)" className={textareaClass} />
                </FormField>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
                <FormField label="상태">
                  <select {...register('status')} className={selectClass}>
                    <option value="published">공개</option>
                    <option value="draft">임시저장</option>
                    <option value="archived">보관</option>
                  </select>
                </FormField>
                <FormField label="공개 예약">
                  <input type="datetime-local" {...register('scheduledAt')} className={inputClass} />
                  {scheduledAt && statusVal === 'published' && <p className="mt-1 text-xs text-gray-400">예약 시각이 지나면 자동으로 노출됩니다.</p>}
                </FormField>
              </div>

              {/* 설교 스터디 (선택) — 매거진/질문지. 접이식. */}
              <div className="mt-5 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => setStudyOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">설교 스터디 (선택 · 매거진)</span>
                  <span className="text-xs text-gray-400">{studyOpen ? '접기' : '펼치기'}</span>
                </button>
                {studyOpen && (
                  <div className="mt-4">
                    <p className="mb-3 text-xs text-gray-500">홈 설교 매거진·질문지에 표시됩니다. 비워두면 표시되지 않습니다.</p>
                    <FormField label="한 줄 요약">
                      <input className={inputClass} value={study.oneLineSummary} onChange={(e) => setStudy((s) => ({ ...s, oneLineSummary: e.target.value }))} placeholder="예: 환경이 아니라 그분께 생명의 샘이 있습니다" />
                    </FormField>
                    <FormField label="써머리">
                      <textarea className={textareaClass} rows={3} value={study.summary} onChange={(e) => setStudy((s) => ({ ...s, summary: e.target.value }))} placeholder="설교의 핵심을 2~3문단으로" />
                    </FormField>
                    <QuestionList label="관찰 질문" hint="본문에 무엇이 쓰여 있는가" values={study.observation} onChange={(v) => setStudy((s) => ({ ...s, observation: v }))} />
                    <QuestionList label="심화 질문" hint="왜 그렇게 말씀하셨는가" values={study.deep} onChange={(v) => setStudy((s) => ({ ...s, deep: v }))} />
                    <QuestionList label="적용 질문" hint="내 삶에서는 어떻게 되는가" values={study.application} onChange={(v) => setStudy((s) => ({ ...s, application: v }))} />
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ── 탭 2: 설교 원고 (비공개) ── */}
          {tab === 'manuscript' && (
            <Card>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">설교 원고 · 비공개</span>
                <span className="text-xs text-gray-400">웹에는 공개되지 않습니다 · 원고를 드래그해 선택한 뒤 단으로 보냅니다</span>
              </div>
              <RichArea
                inputRef={manuscriptRef}
                value={manuscript}
                onChange={setManuscript}
                rows={20}
                placeholder="강단에서 쓴 원고 전문을 그대로 붙여 넣으세요. 길이 제한 없습니다."
                headerAction={<button type="button" onClick={sendSelectionToNewSection} className="text-sm font-medium" style={{ color: 'var(--brand, #1466d6)' }}>선택 영역을 새 단으로 ›</button>}
              />
            </Card>
          )}

          {/* ── 탭 3: 지면 구성 ── */}
          {tab === 'layout' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
              <Card className="self-start">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">지면 구성</span>
                  <span className="text-xs text-gray-400">끌어서 순서 변경</span>
                </div>
                <div className="space-y-2">
                  {sections.map((s, i) => (
                    <div key={i} draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragIdx !== null) moveSection(dragIdx, i); setDragIdx(null); }}
                      onClick={() => setActiveSec(i)}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 ${i === activeSec ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <span className="cursor-grab text-gray-300" aria-hidden>⋮⋮</span>
                      <span className="text-xs font-bold text-gray-400">{String(i + 1).padStart(2, '0')}</span>
                      <span className={`flex-1 truncate text-sm ${s.subtitle ? 'font-medium text-gray-900' : 'text-gray-400'}`}>{s.subtitle || '소제목 없음'}</span>
                    </div>
                  ))}
                  <button type="button" onClick={addSection} className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:bg-gray-50">+ 단 추가</button>
                </div>
              </Card>

              <Card>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">소제목</label>
                  <button type="button" onClick={() => removeSection(activeSec)} className="text-xs text-gray-400 hover:text-red-600">이 단 삭제</button>
                </div>
                <input value={sec.subtitle ?? ''} onChange={(e) => updateSection(activeSec, { subtitle: e.target.value })} placeholder="이 단의 소제목" className={`${inputClass} mb-4`} />

                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">본문</label>
                  <button type="button" onClick={pullManuscriptToSection} className="text-xs font-medium text-gray-500 hover:text-gray-900">원고에서 가져오기</button>
                </div>
                <RichArea showLink value={sec.body ?? ''} onChange={(v) => updateSection(activeSec, { body: v })} rows={10} placeholder="웹에 실릴 글입니다. 읽기 좋게 다듬어 주세요." />
                <p className="mb-4 mt-1 text-xs text-gray-400">문단 사이를 비우면 페이지에서 단락으로 나뉩니다.</p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-gray-700">이 단의 사진</p>
                    <ImageUpload label="" value={sec.imageUrl ?? ''} onChange={(url) => updateSection(activeSec, { imageUrl: url })} onUpload={uploadImage} resize="content" aspectRatio="16/9" />
                  </div>
                  <div className="space-y-4">
                    <FormField label="사진 설명">
                      <input value={sec.caption ?? ''} onChange={(e) => updateSection(activeSec, { caption: e.target.value })} placeholder="캡션 (선택)" className={inputClass} />
                    </FormField>
                    <FormField label="대체 텍스트">
                      <input value={sec.alt ?? ''} onChange={(e) => updateSection(activeSec, { alt: e.target.value })} placeholder="화면 낭독기용 설명" className={inputClass} />
                    </FormField>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </form>

        {(createMutation.isError || updateMutation.isError) && <p className="mt-4 text-sm text-red-500">저장 중 오류가 발생했습니다.</p>}

        {catManagerOpen && (
          <CategoryManager
            title="설교 카테고리"
            list={() => apiClient!.getSermonCategoriesList()}
            create={(name, slug) => apiClient!.createSermonCategory({ name, slug })}
            update={(id, patch) => apiClient!.updateSermonCategory(id, patch)}
            remove={(id) => apiClient!.deleteSermonCategory(id)}
            onClose={() => setCatManagerOpen(false)}
            onChanged={() => void queryClient.invalidateQueries({ queryKey: ['taxonomies', 'sermon_category'] })}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">설교 관리</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setCatManagerOpen(true)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">카테고리 관리</button>
          {bulk.count > 0 && (
            <button onClick={() => void bulk.deleteSelected()} disabled={bulk.busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50">선택 삭제 ({bulk.count})</button>
          )}
          <YoutubeImportButton target="sermons" categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))} preachers={(preachers ?? []).map((p) => ({ id: p.id, name: p.name }))} onDone={() => refetch()} />
          <button onClick={handleCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">새 설교</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input type="text" placeholder="검색..." value={params.search || ''} onChange={(e) => setParams((p) => ({ ...p, search: e.target.value, page: 1 }))} className="w-full rounded border px-3 py-2 sm:w-64" />
        <select value={params.category || ''} onChange={(e) => setParams((p) => ({ ...p, category: e.target.value || undefined, page: 1 }))} className="rounded border px-3 py-2">
          <option value="">전체 카테고리</option>
          {categories?.map((cat) => <option key={cat.id} value={cat.slug}>{cat.name}</option>)}
        </select>
        <select value={params.preacher || ''} onChange={(e) => setParams((p) => ({ ...p, preacher: e.target.value || undefined, page: 1 }))} className="rounded border px-3 py-2">
          <option value="">전체 설교자</option>
          {preachers?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {isLoading && <TableSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {data && data.data.length === 0 && !isLoading && (
        <EmptyState icon="🎤" title="등록된 설교가 없습니다" description="새로운 설교를 추가해보세요." actionLabel="설교 추가" onAction={() => handleCreate()} />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="w-10 px-4 py-3"><input type="checkbox" checked={bulk.isAllSelected(data.data)} onChange={() => bulk.toggleAll(data.data)} aria-label="전체 선택" /></th>
                  <th className="px-4 py-3 text-left text-sm font-medium">제목</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">설교자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">성경구절</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">날짜</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3"><input type="checkbox" checked={bulk.has(item.id)} onChange={() => bulk.toggle(item.id)} aria-label={`${item.title} 선택`} /></td>
                    <td className="px-4 py-3 text-sm font-medium">{item.title}</td>
                    <td className="px-4 py-3 text-sm">{item.preacher}</td>
                    <td className="px-4 py-3 text-sm">{item.scripture}</td>
                    <td className="px-4 py-3 text-sm">{item.date ? String(item.date).slice(0, 10) : '-'}</td>
                    <td className="px-4 py-3 text-sm">{item.status === 'published' ? '공개' : item.status === 'draft' ? '임시저장' : '보관'}</td>
                    <td className="space-x-2 px-4 py-3 text-sm">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:underline">편집</button>
                      <button onClick={() => handleDelete(item)} disabled={deleteMutation.isPending} className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">총 {data.total}건 (페이지 {data.page}/{data.totalPages})</span>
            <div className="flex gap-2">
              <button disabled={data.page <= 1} onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) - 1 }))} className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50">이전</button>
              <button disabled={data.page >= data.totalPages} onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) + 1 }))} className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50">다음</button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget!.id, {
            onSuccess: () => showToast('success', '삭제되었습니다.'),
            onError: () => showToast('error', '오류가 발생했습니다.'),
          });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {catManagerOpen && (
        <CategoryManager
          title="설교 카테고리"
          list={() => apiClient!.getSermonCategoriesList()}
          create={(name, slug) => apiClient!.createSermonCategory({ name, slug })}
          update={(id, patch) => apiClient!.updateSermonCategory(id, patch)}
          remove={(id) => apiClient!.deleteSermonCategory(id)}
          onClose={() => setCatManagerOpen(false)}
          onChanged={() => void queryClient.invalidateQueries({ queryKey: ['taxonomies', 'sermon_category'] })}
        />
      )}
    </div>
  );
}

// 여러 줄 텍스트 → 질문 배열 (앞 번호/불릿 제거)
function splitQuestions(text: string): string[] {
  return text.split(/\r?\n/).map((s) => s.replace(/^\s*(?:\d+\s*[.)]|[-•*·])\s*/, '').trim()).filter(Boolean);
}

function QuestionList({ label, hint, values, onChange }: { label: string; hint: string; values: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const addMany = () => { const lines = splitQuestions(draft); if (!lines.length) return; onChange([...values, ...lines]); setDraft(''); };
  const edit = (i: number, v: string) => onChange(values.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => onChange(values.filter((_, j) => j !== i));
  return (
    <FormField label={label}>
      <p className="mb-2 text-xs text-gray-400">{hint} · <span className="text-blue-500">여러 개는 줄바꿈으로 한 번에 붙여넣으세요.</span></p>
      <div className="space-y-2">
        {values.map((q, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-2.5 w-6 shrink-0 text-right text-xs font-semibold text-blue-600">{String(i + 1).padStart(2, '0')}</span>
            <textarea className={textareaClass} rows={2} value={q} onChange={(e) => edit(i, e.target.value)} />
            <button type="button" onClick={() => remove(i)} className="mt-2 shrink-0 text-xs text-gray-400 hover:text-red-600">삭제</button>
          </div>
        ))}
        <div className="flex items-start gap-2">
          <textarea className={textareaClass} rows={2} value={draft} placeholder={`${label} 입력 — 여러 개는 줄바꿈으로 붙여넣으면 한 번에 등록`} onChange={(e) => setDraft(e.target.value)}
            onPaste={(e) => { const text = e.clipboardData.getData('text'); const lines = splitQuestions(text); if (lines.length > 1) { e.preventDefault(); onChange([...values, ...lines]); setDraft(''); } }}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); addMany(); } }} />
          <button type="button" onClick={addMany} className="mt-0.5 shrink-0 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">＋ 추가</button>
        </div>
      </div>
    </FormField>
  );
}
