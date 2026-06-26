import { useState } from 'react';
import type { YoutubeSource, YoutubeImportVideo } from '@dw-church/api-client';
import { useDWChurchClient } from '@dw-church/api-client';
import { useToast } from './index';
import { useAuthStore } from '../stores/auth';

interface Props {
  target: 'sermons' | 'videos';
  categories: { id: string; name: string }[];
  preachers?: { id: string; name: string }[];
  onDone: () => void;
}

type Stage = 'input' | 'sources' | 'videos';

const SOURCE_LABEL: Record<YoutubeSource['type'], string> = {
  uploads: '채널 전체',
  playlist: '재생목록',
  live: '라이브',
};

/**
 * YouTube → 설교/영상 가져오기. 3단계: 채널 URL 입력 → 소스(채널 전체/재생목록/
 * 라이브) 선택 → 영상 선택 후 가져오기. 영상은 오래된 순으로 정렬되고, 이미
 * 가져온 항목은 잠금 표시된다. 설교는 제목/설명에서 성경본문·설교주일을 best-effort
 * 추출(없으면 공란, 추측 생성 안 함).
 */
export default function YoutubeImportButton({ target, categories, preachers = [], onDone }: Props) {
  const client = useDWChurchClient();
  const { showToast } = useToast();
  // Super-admin only — bulk YouTube import is an operator tool.
  const isSuperAdmin = !!useAuthStore((s) => s.session)?.user?.isSuperAdmin;

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('input');
  const [busy, setBusy] = useState(false);

  const [channel, setChannel] = useState('');
  const [channelTitle, setChannelTitle] = useState('');
  const [sources, setSources] = useState<YoutubeSource[]>([]);

  const [videos, setVideos] = useState<YoutubeImportVideo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [categoryId, setCategoryId] = useState('');
  const [preacher, setPreacher] = useState('');

  const reset = () => {
    setStage('input'); setChannel(''); setChannelTitle(''); setSources([]);
    setVideos([]); setSelected(new Set()); setStatus('published'); setCategoryId(''); setPreacher('');
  };
  const close = () => { setOpen(false); reset(); };

  const loadSources = async () => {
    if (!client || !channel.trim()) return;
    setBusy(true);
    try {
      const res = await client.youtubeImportSources(channel.trim());
      setChannelTitle(res.channelTitle);
      setSources(res.sources);
      setStage('sources');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '소스를 불러오지 못했습니다.');
    } finally { setBusy(false); }
  };

  const loadVideos = async (src: YoutubeSource) => {
    if (!client) return;
    setBusy(true);
    try {
      const res = await client.youtubeImportFetch(src, target);
      setVideos(res.videos);
      // Default-select all NEW (not already imported) videos.
      setSelected(new Set(res.videos.filter((v) => !v.alreadyImported).map((v) => v.videoId)));
      setStage('videos');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '영상을 불러오지 못했습니다.');
    } finally { setBusy(false); }
  };

  const toggle = (id: string) => setSelected((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const selectableIds = videos.filter((v) => !v.alreadyImported).map((v) => v.videoId);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectableIds));

  const apply = async () => {
    if (!client) return;
    const picked = videos.filter((v) => selected.has(v.videoId) && !v.alreadyImported);
    if (picked.length === 0) { showToast('error', '가져올 영상을 선택하세요.'); return; }
    setBusy(true);
    try {
      const res = await client.youtubeImportApply({
        target, status,
        categoryId: categoryId || null,
        preacher: target === 'sermons' ? (preacher || null) : null,
        videos: picked,
      });
      showToast('success', `가져오기 완료 — 추가 ${res.imported}건${res.skipped ? ` · 중복 건너뜀 ${res.skipped}` : ''}`);
      onDone();
      close();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '가져오기 실패');
    } finally { setBusy(false); }
  };

  const newCount = videos.filter((v) => !v.alreadyImported).length;

  if (!isSuperAdmin) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.8-.5-5.6a2.9 2.9 0 0 0-2-2C18.7 4 12 4 12 4s-6.7 0-8.5.4a2.9 2.9 0 0 0-2 2C1 8.2 1 12 1 12s0 3.8.5 5.6a2.9 2.9 0 0 0 2 2C5.3 20 12 20 12 20s6.7 0 8.5-.4a2.9 2.9 0 0 0 2-2C23 15.8 23 12 23 12zM10 15.5v-7l6 3.5-6 3.5z"/></svg>
        YouTube에서 가져오기
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="text-sm font-bold text-gray-900">
                YouTube에서 {target === 'sermons' ? '설교' : '영상'} 가져오기
                {channelTitle && <span className="ml-2 font-normal text-gray-400">{channelTitle}</span>}
              </h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <div className="p-5 overflow-y-auto">
              {/* Stage 1 — channel input */}
              {stage === 'input' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    교회 YouTube <strong>채널 주소</strong>나 <strong>@핸들</strong>, 또는 특정 <strong>재생목록 주소</strong>를 붙여넣으세요.
                  </p>
                  <input
                    autoFocus
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void loadSources(); }}
                    placeholder="https://www.youtube.com/@your-church  또는  채널 ID(UC...)  또는  재생목록 URL"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  />
                  <div className="flex justify-end">
                    <button onClick={() => void loadSources()} disabled={busy || !channel.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
                      {busy ? '불러오는 중…' : '분류 불러오기'}
                    </button>
                  </div>
                </div>
              )}

              {/* Stage 2 — pick a source */}
              {stage === 'sources' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">가져올 <strong>분류</strong>를 선택하세요.</p>
                  {sources.map((s) => (
                    <button
                      key={`${s.type}:${s.id}`}
                      onClick={() => void loadVideos(s)}
                      disabled={busy}
                      className="w-full text-left border rounded-lg px-4 py-3 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-3"
                    >
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.type === 'uploads' ? 'bg-blue-100 text-blue-700'
                        : s.type === 'live' ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'}`}>{SOURCE_LABEL[s.type]}</span>
                      <span className="flex-1 text-sm font-medium text-gray-800 truncate">{s.title}</span>
                      {s.count != null && <span className="text-xs text-gray-400">{s.count}개</span>}
                    </button>
                  ))}
                  <div className="pt-2">
                    <button onClick={() => setStage('input')} className="text-xs text-gray-500 hover:text-gray-800">← 채널 다시 입력</button>
                  </div>
                </div>
              )}

              {/* Stage 3 — pick videos + options */}
              {stage === 'videos' && (
                <div className="space-y-3">
                  {/* options */}
                  <div className="flex flex-wrap items-end gap-3 pb-3 border-b">
                    <label className="text-xs text-gray-600">
                      상태
                      <select value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                        className="block mt-1 border rounded px-2 py-1.5 text-sm">
                        <option value="published">공개</option>
                        <option value="draft">임시저장</option>
                      </select>
                    </label>
                    <label className="text-xs text-gray-600">
                      카테고리(선택)
                      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                        className="block mt-1 border rounded px-2 py-1.5 text-sm min-w-[140px]">
                        <option value="">없음</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </label>
                    {target === 'sermons' && (
                      <label className="text-xs text-gray-600">
                        설교자(선택)
                        <select value={preacher} onChange={(e) => setPreacher(e.target.value)}
                          className="block mt-1 border rounded px-2 py-1.5 text-sm min-w-[120px]">
                          <option value="">없음</option>
                          {preachers.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      </label>
                    )}
                  </div>

                  {/* select-all + count */}
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={selectableIds.length === 0} />
                      <span className="text-gray-700">전체 선택 (새 영상 {newCount}개)</span>
                    </label>
                    <span className="text-gray-400">선택 {[...selected].filter((id) => selectableIds.includes(id)).length} / 총 {videos.length} · 오래된순</span>
                  </div>

                  {/* list */}
                  <div className="border rounded-lg divide-y max-h-[42vh] overflow-y-auto">
                    {videos.length === 0 && <p className="p-4 text-sm text-gray-400 text-center">영상이 없습니다.</p>}
                    {videos.map((v) => {
                      const done = !!v.alreadyImported;
                      return (
                        <label key={v.videoId} className={`flex items-center gap-3 px-3 py-2 ${done ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}>
                          <input type="checkbox" disabled={done} checked={done || selected.has(v.videoId)} onChange={() => !done && toggle(v.videoId)} />
                          <img src={v.thumbnailUrl} alt="" className="w-16 h-9 object-cover rounded bg-gray-100 shrink-0" loading="lazy" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-gray-800 truncate">{v.title}</div>
                            <div className="text-[11px] text-gray-400 flex gap-2">
                              <span>{v.sermonDate || v.publishedAt?.slice(0, 10)}</span>
                              {target === 'sermons' && v.scripture && <span className="text-gray-500">· {v.scripture}</span>}
                              {done && <span className="text-green-600">· 이미 가져옴</span>}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {stage === 'videos' && (
              <div className="flex items-center justify-between px-5 py-3 border-t">
                <button onClick={() => setStage('sources')} className="text-xs text-gray-500 hover:text-gray-800">← 분류 다시 선택</button>
                <button onClick={() => void apply()} disabled={busy}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50">
                  {busy ? '가져오는 중…' : `선택한 영상 가져오기 (${[...selected].filter((id) => selectableIds.includes(id)).length})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
