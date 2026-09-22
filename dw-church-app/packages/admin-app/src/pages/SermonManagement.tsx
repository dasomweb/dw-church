import { useState, useEffect } from 'react';
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

// ─── YouTube 썸네일 유틸 ──────────────────────────────────
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
  subtitle: string;
  scripture: string;
  preacher: string;
  date: string;
  status: PostStatus;
  youtubeUrl: string;
  videoStartAt: string;
  thumbnailUrl: string;
  categoryIds: string;
  serviceType: string;
  series: string;
  slug: string;
  scheduledAt: string;
  homeFeatured: boolean;
  allowComments: boolean;
  language: string;
  seoSummary: string;
}

// 카드 래퍼 (시안 스타일)
function Card({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export default function SermonManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Sermon | null>(null);
  const EMPTY_STUDY = { oneLineSummary: '', summary: '', observation: [] as string[], deep: [] as string[], application: [] as string[] };
  const [study, setStudy] = useState(EMPTY_STUDY);
  const [studyOpen, setStudyOpen] = useState(false);
  // 본문 구성 (멀티 섹션)
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

  // YouTube URL 입력 시 대표 이미지(썸네일) 자동 생성 — 비어 있을 때만.
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
  const handleDeletePreacher = async (id: string, name: string) => {
    if (!window.confirm(`설교자 "${name}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await apiClient!.adapter.delete(`/api/v1/preachers/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['taxonomies', 'sermon_preacher'] });
      showToast('success', `설교자 "${name}" 삭제됨`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패 — 이 설교자를 사용하는 설교가 있는지 확인하세요.');
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
    reset({
      title: item.title,
      subtitle: item.subtitle ?? '',
      scripture: item.scripture,
      preacher: item.preacher,
      date: item.date ? String(item.date).slice(0, 10) : '',
      status: item.status,
      youtubeUrl: item.youtubeUrl,
      videoStartAt: item.videoStartAt ?? '',
      thumbnailUrl: item.thumbnailUrl,
      categoryIds: JSON.stringify(item.categoryIds),
      serviceType: item.serviceType ?? '',
      series: item.series ?? '',
      slug: item.slug ?? '',
      scheduledAt: toLocalInput(item.scheduledAt),
      homeFeatured: !!item.homeFeatured,
      allowComments: !!item.allowComments,
      language: item.language ?? 'ko',
      seoSummary: item.seoSummary ?? '',
    });
    setStudy({
      oneLineSummary: item.oneLineSummary ?? '',
      summary: item.summary ?? '',
      observation: item.observationQuestions ?? [],
      deep: item.deepQuestions ?? [],
      application: item.applicationQuestions ?? [],
    });
    const body = (item.body && item.body.length > 0) ? item.body.map((s) => ({ ...EMPTY_SECTION, ...s })) : [{ ...EMPTY_SECTION }];
    setSections(body);
    setActiveSec(0);
    setTags(item.tags ?? []);
    setStudyOpen((item.observationQuestions?.length ?? 0) + (item.deepQuestions?.length ?? 0) + (item.applicationQuestions?.length ?? 0) > 0 || !!item.summary);
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    setStudy(EMPTY_STUDY);
    setStudyOpen(false);
    setSections([{ ...EMPTY_SECTION }]);
    setActiveSec(0);
    setTags([]);
    reset({
      title: '', subtitle: '', scripture: '', preacher: '', date: '', status: 'published',
      youtubeUrl: '', videoStartAt: '', thumbnailUrl: '', categoryIds: '[]',
      serviceType: '', series: '', slug: '', scheduledAt: '', homeFeatured: false, allowComments: false,
      language: 'ko', seoSummary: '',
    });
    setView('edit');
  };

  const handleDelete = (item: Sermon) => setDeleteTarget({ id: item.id, name: item.title || '' });

  // 본문 구성 조작
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

  const buildPayload = (formData: SermonFormData, status: PostStatus) => ({
    title: formData.title,
    subtitle: formData.subtitle,
    scripture: formData.scripture,
    preacher: formData.preacher,
    date: formData.date,
    categoryIds: JSON.parse(formData.categoryIds || '[]') as string[],
    category: '',
    thumbnailUrl: formData.thumbnailUrl,
    youtubeUrl: formData.youtubeUrl,
    videoStartAt: formData.videoStartAt || null,
    status,
    serviceType: formData.serviceType || null,
    series: formData.series || null,
    slug: formData.slug || null,
    language: formData.language || 'ko',
    seoSummary: formData.seoSummary || null,
    scheduledAt: formData.scheduledAt || null,
    homeFeatured: !!formData.homeFeatured,
    allowComments: !!formData.allowComments,
    tags,
    body: sections.map((s) => ({
      subtitle: s.subtitle || '', body: s.body || '', imageUrl: s.imageUrl || '', caption: s.caption || '', alt: s.alt || '',
    })),
    // 설교 스터디 (선택 · 매거진/질문지)
    oneLineSummary: study.oneLineSummary,
    summary: study.summary,
    observationQuestions: study.observation,
    deepQuestions: study.deep,
    applicationQuestions: study.application,
  });

  const save = (status: PostStatus) => handleSubmit((formData) => {
    const payload = buildPayload(formData, status);
    const onSuccess = () => { showToast('success', status === 'published' ? '공개되었습니다.' : '임시저장되었습니다.'); setView('list'); };
    const onError = () => showToast('error', '오류가 발생했습니다.');
    if (editingItem) updateMutation.mutate({ id: editingItem.id, data: payload }, { onSuccess, onError });
    else createMutation.mutate(payload, { onSuccess, onError });
  })();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (view === 'edit') {
    const sec = sections[activeSec] ?? sections[0]!;
    const scheduledAt = watch('scheduledAt');
    const homeFeatured = watch('homeFeatured');
    const allowComments = watch('allowComments');
    const statusVal = watch('status');
    return (
      <div className="admin-content mx-auto max-w-6xl">
        {/* 상단 바 */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <button type="button" onClick={() => setView('list')} className="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              설교 관리
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{editingItem ? '설교 수정' : '설교 작성'}</h2>
          </div>
          <div className="flex gap-2">
            {editingItem && (
              <button type="button" onClick={() => window.open(`/sermons/${editingItem.id}`, '_blank')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">미리보기</button>
            )}
            <button type="button" disabled={isSaving} onClick={() => save('draft')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">임시저장</button>
            <button type="button" disabled={isSaving} onClick={() => save('published')} className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50">공개</button>
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* ── 좌측 메인 ── */}
          <div className="space-y-6">
            <Card title="기본 정보">
              <FormField label="제목" required error={errors.title?.message}>
                <input {...register('title', { required: '제목을 입력하세요' })} placeholder="예) 심령이 가난한 자는 복이 있나니" className={inputClass} />
              </FormField>
              <FormField label="부제">
                <input {...register('subtitle')} placeholder="목록과 카드에 함께 보입니다 (선택)" className={inputClass} />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="성경 본문">
                  <input {...register('scripture')} placeholder="마태복음 5:1–12" className={inputClass} />
                </FormField>
                <FormField label="설교자">
                  <div className="flex gap-2">
                    <select {...register('preacher')} className={`${selectClass} flex-1`}>
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
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="예배 구분">
                  <input list="service-types" {...register('serviceType')} placeholder="주일설교" className={inputClass} />
                  <datalist id="service-types">{SERVICE_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
                </FormField>
                <FormField label="시리즈">
                  <input {...register('series')} placeholder="예: 마태복음 강해 (선택)" className={inputClass} />
                </FormField>
                <FormField label="주소 (slug)">
                  <input {...register('slug')} placeholder="2026-09-20-matthew-5" className={inputClass} />
                </FormField>
              </div>
            </Card>

            {/* 본문 구성 */}
            <Card title={`본문 구성 · ${sections.length}단`} action={<span className="text-xs text-gray-400">번호 왼쪽을 끌어 순서 변경</span>}>
              <div className="space-y-2">
                {sections.map((s, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => setDragIdx(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragIdx !== null) moveSection(dragIdx, i); setDragIdx(null); }}
                    onClick={() => setActiveSec(i)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${i === activeSec ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <span className="cursor-grab text-gray-300" aria-hidden>⋮⋮</span>
                    <span className="text-xs font-bold text-gray-400">{String(i + 1).padStart(2, '0')}</span>
                    <span className={`flex-1 text-sm ${s.subtitle ? 'font-medium text-gray-900' : 'text-gray-400'}`}>{s.subtitle || '소제목 없음'}</span>
                  </div>
                ))}
                <button type="button" onClick={addSection} className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:bg-gray-50">+ 단 추가</button>
              </div>

              {/* 선택된 단 편집 */}
              <div className="mt-5 border-t border-gray-100 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{String(activeSec + 1).padStart(2, '0')}단 편집</span>
                  <button type="button" onClick={() => removeSection(activeSec)} className="text-xs text-gray-400 hover:text-red-600">이 단 삭제</button>
                </div>
                <FormField label="소제목">
                  <input value={sec.subtitle ?? ''} onChange={(e) => updateSection(activeSec, { subtitle: e.target.value })} placeholder="이 단의 소제목" className={inputClass} />
                </FormField>
                <FormField label="본문">
                  <textarea value={sec.body ?? ''} onChange={(e) => updateSection(activeSec, { body: e.target.value })} rows={8} placeholder="설교 원고를 붙여 넣으세요." className={textareaClass} />
                  <p className="mt-1 text-xs text-gray-400">문단 사이를 비우면 페이지에서 단락으로 나뉩니다.</p>
                </FormField>
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
              </div>
            </Card>

            {/* 영상 (음성/주보 PDF 제외 — 대표님 지시) */}
            <Card title="영상">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="영상 주소">
                  <input
                    {...register('youtubeUrl', { onBlur: (e) => { const clean = normalizeYoutubeUrl(e.target.value); if (clean !== e.target.value) setValue('youtubeUrl', clean, { shouldDirty: true }); } })}
                    placeholder="YouTube / Vimeo URL" className={inputClass}
                  />
                  {youtubeUrl && !videoId && <p className="mt-1 text-xs text-red-500">유효한 YouTube URL이 아닙니다.</p>}
                </FormField>
                <FormField label="영상 시작 지점">
                  <input {...register('videoStartAt')} placeholder="00:00" className={inputClass} />
                </FormField>
              </div>
            </Card>

            {/* 설교 스터디 (선택) — 매거진/질문지. 접이식. */}
            <Card
              title="설교 스터디 (선택)"
              action={<button type="button" onClick={() => setStudyOpen((v) => !v)} className="text-xs text-gray-500 hover:text-gray-700">{studyOpen ? '접기' : '펼치기'}</button>}
            >
              {studyOpen ? (
                <>
                  <p className="mb-3 text-xs text-gray-500">홈 설교 매거진·질문지에 표시됩니다. 비워두면 표시되지 않습니다.</p>
                  <FormField label="한 줄 요약">
                    <input className={inputClass} value={study.oneLineSummary} onChange={(e) => setStudy((s) => ({ ...s, oneLineSummary: e.target.value }))} placeholder="예: 환경이 아니라 그분께 생명의 샘이 있습니다" />
                  </FormField>
                  <FormField label="써머리 (설교 요약)">
                    <textarea className={textareaClass} rows={3} value={study.summary} onChange={(e) => setStudy((s) => ({ ...s, summary: e.target.value }))} placeholder="설교의 핵심을 2~3문단으로 정리" />
                  </FormField>
                  <QuestionList label="관찰 질문" hint="본문에 무엇이 쓰여 있는가" values={study.observation} onChange={(v) => setStudy((s) => ({ ...s, observation: v }))} />
                  <QuestionList label="심화 질문" hint="왜 그렇게 말씀하셨는가" values={study.deep} onChange={(v) => setStudy((s) => ({ ...s, deep: v }))} />
                  <QuestionList label="적용 질문" hint="내 삶에서는 어떻게 되는가" values={study.application} onChange={(v) => setStudy((s) => ({ ...s, application: v }))} />
                </>
              ) : (
                <p className="text-xs text-gray-400">매거진 한줄요약·써머리·관찰/심화/적용 질문 (선택)</p>
              )}
            </Card>
          </div>

          {/* ── 우측 사이드바 ── */}
          <div className="space-y-6">
            <Card title="게시">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">상태</span>
                  <select {...register('status')} className="rounded border border-gray-200 px-2 py-1 text-sm font-semibold">
                    <option value="published">공개</option>
                    <option value="draft">임시저장</option>
                    <option value="archived">보관</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">공개 예약</span>
                  <input type="datetime-local" {...register('scheduledAt')} className="rounded border border-gray-200 px-2 py-1 text-sm" />
                </div>
                {scheduledAt && statusVal === 'published' && (
                  <p className="text-xs text-gray-400">예약 시각이 지나면 자동으로 홈페이지에 노출됩니다.</p>
                )}
                <label className="flex items-center justify-between">
                  <span className="text-gray-500">홈 대표글</span>
                  <span className="flex items-center gap-2">
                    <input type="checkbox" {...register('homeFeatured')} className="h-4 w-4" />
                    <span className="text-xs font-semibold text-gray-700">{homeFeatured ? '켜짐' : '꺼짐'}</span>
                  </span>
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-gray-500">댓글 허용</span>
                  <span className="flex items-center gap-2">
                    <input type="checkbox" {...register('allowComments')} className="h-4 w-4" />
                    <span className="text-xs font-semibold text-gray-700">{allowComments ? '켜짐' : '꺼짐'}</span>
                  </span>
                </label>
              </div>
            </Card>

            <Card title="대표 이미지">
              <ImageUpload label="" value={thumbnailUrl} onChange={(url) => setValue('thumbnailUrl', url, { shouldDirty: true })} onUpload={uploadImage} resize="content" aspectRatio="16/9" />
              <p className="mt-1 text-xs text-gray-400">목록·공유용 이미지 · 권장 1200×675. YouTube URL 입력 시 자동 생성됩니다.</p>
              <input type="hidden" {...register('thumbnailUrl')} />
            </Card>

            <Card title="분류" action={<button type="button" onClick={() => setCatManagerOpen(true)} className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200">카테고리 관리</button>}>
              <p className="mb-1.5 text-sm font-medium text-gray-700">카테고리</p>
              <div className="mb-4 max-h-32 space-y-1 overflow-y-auto rounded border p-2">
                {(() => {
                  let selectedIds: string[] = [];
                  try { selectedIds = JSON.parse(watch('categoryIds') || '[]'); } catch { selectedIds = []; }
                  return categories?.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selectedIds.includes(cat.id)} onChange={(e) => {
                        const next = e.target.checked ? [...new Set([...selectedIds, cat.id])] : selectedIds.filter((x) => x !== cat.id);
                        setValue('categoryIds', JSON.stringify(next), { shouldDirty: true });
                      }} className="rounded" />
                      {cat.name}
                    </label>
                  ));
                })()}
                {(!categories || categories.length === 0) && <p className="text-sm text-gray-400">카테고리가 없습니다</p>}
              </div>
              <input type="hidden" {...register('categoryIds')} />

              <p className="mb-1.5 text-sm font-medium text-gray-700">태그</p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                    {t}
                    <button type="button" onClick={() => setTags((ts) => ts.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600">×</button>
                  </span>
                ))}
              </div>
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = tagDraft.trim(); if (v && !tags.includes(v)) setTags((ts) => [...ts, v]); setTagDraft(''); } }}
                placeholder="태그 입력 후 Enter"
                className={`${inputClass} mb-4`}
              />

              <p className="mb-1.5 text-sm font-medium text-gray-700">언어</p>
              <select {...register('language')} className={selectClass}>
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </select>
            </Card>

            <Card title="검색 노출">
              <FormField label="요약">
                <textarea {...register('seoSummary')} rows={3} placeholder="목록과 검색에 보일 2–3줄" className={textareaClass} />
                <p className="mt-1 text-xs text-gray-400">비워두면 써머리 또는 첫 문단을 사용합니다.</p>
              </FormField>
            </Card>
          </div>
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
                    <td className="px-4 py-3 text-sm font-medium">
                      {item.title}
                      {item.homeFeatured && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">홈 대표</span>}
                    </td>
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

// 여러 줄 텍스트 → 질문 배열. 각 줄의 앞 번호/불릿 제거 + 빈 줄 제거.
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
