import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../components';

// ─── API Helper ─────────────────────────────────────────────

function useAdminApi() {
  const session = useAuthStore((s) => s.session);
  return useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const host = window.location.hostname;
      const baseUrl = host.startsWith('admin.')
        ? `https://api.${host.replace('admin.', '')}`
        : (import.meta.env.VITE_API_BASE_URL as string) || '';
      const headers: Record<string, string> = {
        Authorization: `Bearer ${session?.accessToken || ''}`,
        ...(options?.headers as Record<string, string>),
      };
      if (options?.body) headers['Content-Type'] = 'application/json';
      const res = await fetch(`${baseUrl}/api/v1/migration${path}`, { ...options, headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [session?.accessToken],
  );
}

// ─── Types ──────────────────────────────────────────────────

interface MigrationJob {
  id: string;
  tenantSlug: string;
  sourceUrl: string | null;
  youtubeChannelUrl: string | null;
  status: string;
  rawData: {
    source: { url: string; type: string; scrapedAt: string };
    pages: { url: string; title: string; textContent: string; images: string[] }[];
    youtubeVideos: { title: string; videoId: string; date: string; thumbnailUrl: string }[];
  };
  classifiedData: ClassifiedData;
  applyResult: Record<string, number>;
  errorMessage: string | null;
  createdAt: string;
}

interface ClassifiedData {
  churchInfo: { name: string; address: string; phone: string; email: string; description: string };
  sermons: { title: string; scripture: string; preacher: string; date: string; youtubeUrl: string; thumbnailUrl: string }[];
  bulletins: { title: string; date: string; pdfUrl: string; images: string[] }[];
  columns: { title: string; content: string; topImageUrl: string; youtubeUrl: string }[];
  events: { title: string; description: string; date: string; location: string; imageUrl: string }[];
  albums: { title: string; images: string[]; youtubeUrl: string }[];
  boards: { boardSlug: string; boardTitle: string; posts: { title: string; content: string; author: string; date: string }[] }[];
  staff: { name: string; role: string; department: string; photoUrl: string; bio: string }[];
  history: { year: number; month: string; title: string; description: string }[];
  worshipTimes: { name: string; day: string; time: string; location: string }[];
  menus: { label: string; pageSlug: string; parentLabel: string | null; sortOrder: number }[];
  pageContents: { pageSlug: string; blocks: { blockType: string; props: Record<string, unknown> }[] }[];
  images: string[];
}

type Step = 'input' | 'extracting' | 'extracted' | 'classified' | 'applying' | 'done';

// ─── Component ──────────────────────────────────────────────

export default function MigrationTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('input');
  const [siteUrl, setSiteUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [targetSlug, setTargetSlug] = useState('');
  const [tenants, setTenants] = useState<{ slug: string; name: string }[]>([]);
  const [job, setJob] = useState<MigrationJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<MigrationJob[]>([]);

  // Fetch tenants on mount
  useEffect(() => {
    const host = window.location.hostname;
    const baseUrl = host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
    const token = useAuthStore.getState().session?.accessToken || '';
    fetch(`${baseUrl}/api/v1/admin/tenants?page=1&perPage=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setTenants(d.data || []))
      .catch(() => {});
  }, []);

  // Fetch existing jobs on mount
  useEffect(() => {
    apiFetch<{ data: MigrationJob[] }>('/jobs')
      .then((res) => setJobs(res.data || []))
      .catch(() => {});
  }, [apiFetch]);

  // ─── Actions ──────────────────────────────────────────────

  const handleCreateAndExtract = async () => {
    if (!targetSlug) { showToast('error', '대상 테넌트를 선택하세요'); return; }
    if (!siteUrl && !youtubeUrl) { showToast('error', 'URL을 입력하세요'); return; }

    setLoading(true);
    setStep('extracting');
    try {
      // Create job
      const { data: newJob } = await apiFetch<{ data: MigrationJob }>('/jobs', {
        method: 'POST',
        body: JSON.stringify({ tenantSlug: targetSlug, sourceUrl: siteUrl, youtubeChannelUrl: youtubeUrl }),
      });
      setJob(newJob);

      // Extract
      const { data: extracted } = await apiFetch<{ data: MigrationJob }>(`/jobs/${newJob.id}/extract`, { method: 'POST' });
      setJob(extracted);

      // Classify
      const { data: classified } = await apiFetch<{ data: MigrationJob }>(`/jobs/${extracted.id}/classify`, { method: 'POST' });
      setJob(classified);
      setStep('classified');
      showToast('success', '추출 및 분류 완료');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '추출 실패');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!job) return;
    if (!window.confirm(`"${job.tenantSlug}" 테넌트에 마이그레이션을 적용하시겠습니까?`)) return;

    setLoading(true);
    setStep('applying');
    try {
      // Save reviewed data first
      await apiFetch(`/jobs/${job.id}`, {
        method: 'PUT',
        body: JSON.stringify({ classifiedData: job.classifiedData }),
      });

      // Apply
      const { data: applied } = await apiFetch<{ data: MigrationJob }>(`/jobs/${job.id}/apply`, { method: 'POST' });
      setJob(applied);
      setStep('done');
      showToast('success', '마이그레이션 완료');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '적용 실패');
      setStep('classified');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setJob(null);
    setSiteUrl('');
    setYoutubeUrl('');
    setTargetSlug('');
  };

  const loadJob = async (jobId: string) => {
    try {
      const { data } = await apiFetch<{ data: MigrationJob }>(`/jobs/${jobId}`);
      setJob(data);
      setTargetSlug(data.tenantSlug);
      if (data.status === 'done') setStep('done');
      else if (['classified', 'approved'].includes(data.status)) setStep('classified');
      else if (data.status === 'extracted') setStep('extracted');
      else setStep('input');
    } catch (err) {
      showToast('error', '작업 불러오기 실패');
    }
  };

  // ─── Classified data editor helpers ───────────────────────

  const cd = job?.classifiedData;

  const updateField = <K extends keyof ClassifiedData>(key: K, value: ClassifiedData[K]) => {
    if (!job) return;
    setJob({ ...job, classifiedData: { ...job.classifiedData, [key]: value } });
  };

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Step 1: Input ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">1단계: 소스 입력</h3>
        <p className="text-xs text-gray-500 mb-4">마이그레이션할 사이트 URL과 대상 테넌트를 선택하세요.</p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input type="url" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="웹사이트 URL (예: https://example-church.com)" disabled={loading}
              className="flex-1 border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="YouTube 채널 URL (선택)" disabled={loading}
              className="flex-1 border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <select value={targetSlug} onChange={(e) => setTargetSlug(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm flex-1" disabled={loading}>
              <option value="">대상 테넌트 선택</option>
              {tenants.map((t) => (
                <option key={t.slug} value={t.slug}>{t.name || t.slug}</option>
              ))}
            </select>
            <button onClick={handleCreateAndExtract}
              disabled={loading || (!siteUrl && !youtubeUrl) || !targetSlug}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading && step === 'extracting' ? '추출 중...' : '추출 시작'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Previous jobs ── */}
      {jobs.length > 0 && step === 'input' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">이전 작업</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {jobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-xs">
                <div>
                  <span className="font-medium">{j.tenantSlug}</span>
                  <span className="text-gray-400 ml-2">{j.sourceUrl || j.youtubeChannelUrl}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    j.status === 'done' ? 'bg-green-100 text-green-700'
                    : j.status === 'failed' ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}>{j.status}</span>
                  <button onClick={() => loadJob(j.id)} className="text-blue-600 hover:underline">열기</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2/3: Classification Review ── */}
      {cd && (step === 'classified' || step === 'extracted') && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">2단계: 분류 결과 검토</h3>
            <span className="text-xs text-gray-400">
              {job?.rawData?.pages?.length || 0}페이지, {job?.rawData?.youtubeVideos?.length || 0}영상 수집됨
            </span>
          </div>

          {/* Church Info */}
          <Section title="교회 기본정보" count={cd.churchInfo.name ? 1 : 0}>
            <div className="grid grid-cols-2 gap-2">
              <Input label="교회 이름" value={cd.churchInfo.name}
                onChange={(v) => updateField('churchInfo', { ...cd.churchInfo, name: v })} />
              <Input label="전화번호" value={cd.churchInfo.phone}
                onChange={(v) => updateField('churchInfo', { ...cd.churchInfo, phone: v })} />
              <Input label="주소" value={cd.churchInfo.address}
                onChange={(v) => updateField('churchInfo', { ...cd.churchInfo, address: v })} />
              <Input label="이메일" value={cd.churchInfo.email}
                onChange={(v) => updateField('churchInfo', { ...cd.churchInfo, email: v })} />
            </div>
          </Section>

          {/* Sermons */}
          <Section title="설교" count={cd.sermons.length}>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {cd.sermons.map((s, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded text-xs">
                  <input type="checkbox" defaultChecked className="rounded"
                    onChange={(e) => {
                      if (!e.target.checked) {
                        updateField('sermons', cd.sermons.filter((_, idx) => idx !== i));
                      }
                    }} />
                  <span className="flex-1 truncate">{s.title || s.youtubeUrl}</span>
                  <span className="text-gray-400">{s.date}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Staff */}
          <Section title="교역자" count={cd.staff.length}>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {cd.staff.map((s, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded text-xs">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-gray-400">{s.role}</span>
                  {s.photoUrl && <span className="text-green-500">사진</span>}
                </div>
              ))}
            </div>
          </Section>

          {/* Bulletins */}
          <Section title="주보" count={cd.bulletins.length}>
            <ItemList items={cd.bulletins} render={(b) => `${b.title} (${b.date})`} />
          </Section>

          {/* Events */}
          <Section title="행사/소식" count={cd.events.length}>
            <ItemList items={cd.events} render={(e) => `${e.title} (${e.date})`} />
          </Section>

          {/* Albums */}
          <Section title="앨범" count={cd.albums.length}>
            <ItemList items={cd.albums} render={(a) => `${a.title} (${a.images.length}장)`} />
          </Section>

          {/* Columns */}
          <Section title="칼럼" count={cd.columns.length}>
            <ItemList items={cd.columns} render={(c) => c.title} />
          </Section>

          {/* History */}
          <Section title="연혁" count={cd.history.length}>
            <ItemList items={cd.history} render={(h) => `${h.year}년 ${h.month ? h.month + '월' : ''} ${h.title}`} />
          </Section>

          {/* Worship Times */}
          <Section title="예배시간" count={cd.worshipTimes.length}>
            <ItemList items={cd.worshipTimes} render={(w) => `${w.name} ${w.day} ${w.time} ${w.location}`} />
          </Section>

          {/* Page Contents */}
          <Section title="페이지 콘텐츠" count={cd.pageContents.length}>
            {cd.pageContents.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded text-xs">
                <span className="font-medium text-gray-700">/{p.pageSlug}</span>
                <div className="flex gap-1 flex-1 justify-end">
                  {p.blocks.map((b, bi) => (
                    <span key={bi} className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">{b.blockType}</span>
                  ))}
                </div>
              </div>
            ))}
          </Section>

          {/* Images */}
          <Section title="이미지 (R2 업로드 대상)" count={cd.images.length}>
            <p className="text-xs text-gray-500">{cd.images.length}개 이미지가 R2로 마이그레이션됩니다.</p>
          </Section>

          {/* Excluded notice */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <strong>자동 적용 제외 항목</strong> (관리자 직접 세팅 필요):
            hero_banner 배경 이미지, banner_slider, 테마/색상/폰트, 로고
          </div>

          {/* Apply button */}
          <div className="flex gap-2 mt-6">
            <button onClick={handleReset}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
              처음으로
            </button>
            <button onClick={handleApply}
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {loading ? '적용 중...' : '승인 및 적용'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Applying ── */}
      {step === 'applying' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="animate-pulse text-4xl mb-4">⏳</div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">마이그레이션 적용 중...</h3>
          <p className="text-sm text-gray-500">이미지 업로드, 데이터 등록, 페이지 업데이트를 진행하고 있습니다.</p>
        </div>
      )}

      {/* ── Step 5: Done ── */}
      {step === 'done' && job?.applyResult && (
        <div className="bg-white rounded-xl border border-green-200 p-6">
          <h3 className="text-base font-semibold text-green-800 mb-4">마이그레이션 완료</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {Object.entries(job.applyResult).filter(([, v]) => v > 0).map(([key, val]) => (
              <div key={key} className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-green-700">{val}</p>
                <p className="text-xs text-green-600">{RESULT_LABELS[key] || key}</p>
              </div>
            ))}
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mb-4">
            <strong>직접 세팅이 필요합니다:</strong>
            <ul className="mt-1 list-disc list-inside">
              <li>hero_banner 배경 이미지</li>
              <li>banner_slider 슬라이드</li>
              <li>테마 (색상/폰트)</li>
              <li>로고</li>
            </ul>
          </div>
          <button onClick={handleReset}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
            새 마이그레이션 시작
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {step === 'input' && !loading && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-3xl mb-3">🔄</p>
          <p className="text-sm font-medium text-gray-700 mb-2">사이트 마이그레이션</p>
          <p className="text-xs text-gray-500">
            웹사이트 URL과 YouTube 채널을 입력하면 이미지와 텍스트를 추출하고,<br />
            우리 데이터 구조에 맞게 자동 분류합니다.<br />
            검토 후 승인하면 테넌트에 자동 적용됩니다.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(count > 0);
  return (
    <div className="border border-gray-100 rounded-lg mb-3">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50">
        <span className="text-sm font-medium text-gray-800">{title}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
            {count}건
          </span>
          <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] text-gray-500">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-2 py-1 text-xs" />
    </div>
  );
}

function ItemList<T>({ items, render }: { items: T[]; render: (item: T) => string }) {
  if (items.length === 0) return <p className="text-xs text-gray-400">없음</p>;
  return (
    <div className="max-h-32 overflow-y-auto space-y-0.5">
      {items.map((item, i) => (
        <div key={i} className="px-2 py-1 bg-gray-50 rounded text-xs truncate">{render(item)}</div>
      ))}
    </div>
  );
}

const RESULT_LABELS: Record<string, string> = {
  images: '이미지',
  settings: '설정',
  staff: '교역자',
  sermons: '설교',
  bulletins: '주보',
  columns: '칼럼',
  events: '행사',
  albums: '앨범',
  history: '연혁',
  boards: '게시판',
  pages: '페이지',
  worshipTimes: '예배시간',
  menus: '메뉴',
};
