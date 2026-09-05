import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, textareaClass, useToast, EmptyState } from '../components';

/**
 * NT-01/02 공지 — 리더/구성원 대상 공지. 실제 알림톡·문자·메일 발송은 교회 발송
 * 계정(발송 설정)이 있어야 나가므로, 여기서는 공지 저장 + 어떤 채널로 안내했는지
 * 기록(체크)만 관리한다. 고정·게시기간 지원.
 */
type Notice = Record<string, any>;
const SCOPE_LABEL: Record<string, string> = { all: '전체', leaders: '리더', group: '특정 조직' };

const blank = (): Notice => ({ title: '', body: '', target: { scope: 'all' }, isPinned: false, publishFrom: '', publishTo: '', sendAlrimtalk: false, sendEmail: false, sendSms: false });

export default function GroupNotices() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [editing, setEditing] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const presetQ = useQuery({ queryKey: ['group-preset'], queryFn: async () => (await api.get<{ data: any }>('/api/v1/group-preset') as any).data });
  const noticesQ = useQuery({ queryKey: ['group-notices'], queryFn: async () => (await api.get<{ data: Notice[] }>('/api/v1/group-notices') as any).data as Notice[] });
  const t = presetQ.data?.terminology ?? { leader: '리더' };
  const notices = noticesQ.data ?? [];

  const save = async (n: Notice) => {
    if (!n.title?.trim()) { showToast('error', '제목을 입력하세요.'); return; }
    setBusy(true);
    const payload = { ...n, publishFrom: n.publishFrom || undefined, publishTo: n.publishTo || undefined };
    try {
      if (n.id) await api.put(`/api/v1/group-notices/${n.id}`, payload);
      else await api.post('/api/v1/group-notices', payload);
      qc.invalidateQueries({ queryKey: ['group-notices'] });
      setEditing(null);
      showToast('success', '저장했습니다.');
    } catch (e: any) { showToast('error', e?.message || '저장 실패'); }
    finally { setBusy(false); }
  };
  const del = async (n: Notice) => {
    if (!window.confirm('이 공지를 삭제할까요?')) return;
    try { await api.delete(`/api/v1/group-notices/${n.id}`); qc.invalidateQueries({ queryKey: ['group-notices'] }); if (editing?.id === n.id) setEditing(null); } catch (e: any) { showToast('error', e?.message || '실패'); }
  };
  const openEdit = (n: Notice) => setEditing({ ...n, target: n.target ?? { scope: 'all' }, isPinned: n.is_pinned, publishFrom: n.publish_from ?? '', publishTo: n.publish_to ?? '', sendAlrimtalk: n.send_alrimtalk, sendEmail: n.send_email, sendSms: n.send_sms });

  const channels = (n: Notice) => [n.send_alrimtalk && '알림톡', n.send_email && '메일', n.send_sms && '문자'].filter(Boolean).join('·');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">공지</h1>
          <p className="text-sm text-gray-500 mt-1">{t.leader ?? '리더'}·구성원에게 전할 공지를 등록합니다. 발송은 발송 설정에 계정을 등록해야 실제로 나갑니다.</p>
        </div>
        <button onClick={() => setEditing(blank())} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ 공지 작성</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          {noticesQ.isLoading ? <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div>
            : notices.length === 0 ? <EmptyState icon="📣" title="공지가 없습니다" description="첫 공지를 작성하세요." />
            : (
              <div className="divide-y divide-gray-50">
                {notices.map((n) => (
                  <button key={n.id} onClick={() => openEdit(n)} className="w-full text-left p-4 hover:bg-gray-50 block">
                    <div className="flex items-center gap-2">
                      {n.is_pinned && <span className="text-[10px] font-bold text-amber-600">📌 고정</span>}
                      <b className="text-sm text-gray-800">{n.title}</b>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{SCOPE_LABEL[n.target?.scope] ?? '전체'}</span>
                      {channels(n) && <span className="text-[11px] text-blue-500">{channels(n)}</span>}
                    </div>
                    {n.body && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.body}</p>}
                  </button>
                ))}
              </div>
            )}
        </div>

        {editing && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3 h-fit">
            <h2 className="text-sm font-semibold text-gray-800">{editing.id ? '공지 수정' : '새 공지'}</h2>
            <label className="block"><span className="text-xs font-medium text-gray-600">제목 *</span>
              <input className={inputClass} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} autoFocus /></label>
            <label className="block"><span className="text-xs font-medium text-gray-600">내용</span>
              <textarea className={textareaClass} rows={5} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs font-medium text-gray-600">대상</span>
                <select className={inputClass} value={editing.target?.scope ?? 'all'} onChange={(e) => setEditing({ ...editing, target: { ...editing.target, scope: e.target.value } })}>
                  {Object.entries(SCOPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></label>
              <label className="flex items-center gap-2 text-sm pt-5"><input type="checkbox" checked={!!editing.isPinned} onChange={(e) => setEditing({ ...editing, isPinned: e.target.checked })} className="rounded" /> 상단 고정</label>
              <label className="block"><span className="text-xs font-medium text-gray-600">게시 시작</span>
                <input type="date" className={inputClass} value={editing.publishFrom} onChange={(e) => setEditing({ ...editing, publishFrom: e.target.value })} /></label>
              <label className="block"><span className="text-xs font-medium text-gray-600">게시 종료</span>
                <input type="date" className={inputClass} value={editing.publishTo} onChange={(e) => setEditing({ ...editing, publishTo: e.target.value })} /></label>
            </div>
            <div className="pt-1 border-t border-gray-50">
              <span className="text-xs font-medium text-gray-500">안내 채널 (발송 계정 등록 시 실제 발송)</span>
              <div className="flex gap-3 mt-1.5">
                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={!!editing.sendAlrimtalk} onChange={(e) => setEditing({ ...editing, sendAlrimtalk: e.target.checked })} className="rounded" /> 알림톡</label>
                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={!!editing.sendEmail} onChange={(e) => setEditing({ ...editing, sendEmail: e.target.checked })} className="rounded" /> 메일</label>
                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={!!editing.sendSms} onChange={(e) => setEditing({ ...editing, sendSms: e.target.checked })} className="rounded" /> 문자</label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button disabled={busy} onClick={() => void save(editing)} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">저장</button>
              {editing.id && <button onClick={() => void del(editing)} className="text-sm text-red-600 px-3 py-2 rounded-lg hover:bg-red-50">삭제</button>}
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 ml-auto">취소</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
