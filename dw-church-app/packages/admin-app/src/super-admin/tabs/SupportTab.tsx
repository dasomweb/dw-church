import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner, EmptyState } from '../shared/admin-ui';
import { formatDate } from '../shared/format';
import {
  type SupportStatus,
  type SupportTicket,
  SUPPORT_STATUS_ORDER,
  SUPPORT_STATUS_LABELS,
  SupportStatusBadge,
} from '../shared/support';

// ═══════════════════════════════════════════════════════════
// ─── Tab: Support (고객지원) ─────────────────────────────
// ═══════════════════════════════════════════════════════════
// Phase 4 — support API(/support-tickets) 사용. 목록 + 상태 필터 + 상세 모달
// (답변/저장/삭제). PATCH 의 sendReply:true 면 서버가 이메일을 발송한다.
export default function SupportTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | SupportStatus>('all');
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: SupportTicket[] } | SupportTicket[]>('/support-tickets');
      setTickets(Array.isArray(res) ? res : res.data ?? []);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '지원 티켓 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  // newest-first, then apply the status filter
  const sorted = [...tickets].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const visible = statusFilter === 'all' ? sorted : sorted.filter((t) => t.status === statusFilter);

  const filterTabs: { id: 'all' | SupportStatus; label: string }[] = [
    { id: 'all', label: '전체' },
    ...SUPPORT_STATUS_ORDER.map((s) => ({ id: s, label: SUPPORT_STATUS_LABELS[s] })),
  ];

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {filterTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatusFilter(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <Spinner />
        ) : visible.length === 0 ? (
          <EmptyState
            message={statusFilter === 'all' ? '아직 문의가 없습니다' : '해당 상태의 문의가 없습니다'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 font-medium text-xs">
                  <th className="px-5 py-3">제목</th>
                  <th className="px-5 py-3">교회</th>
                  <th className="px-5 py-3">이메일</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">접수일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((t, idx) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={`cursor-pointer hover:bg-blue-50/60 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{t.subject}</td>
                    <td className="px-5 py-3 text-gray-700 font-mono text-xs">
                      {t.tenantSlug || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{t.email}</td>
                    <td className="px-5 py-3">
                      <SupportStatusBadge status={t.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <SupportTicketModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            void fetchTickets();
          }}
        />
      )}
    </div>
  );
}

function SupportTicketModal({
  ticket,
  onClose,
  onChanged,
}: {
  ticket: SupportTicket;
  onClose: () => void;
  onChanged: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [status, setStatus] = useState<SupportStatus>(ticket.status);
  const [adminReply, setAdminReply] = useState(ticket.adminReply ?? '');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const busy = saving || sending || deleting;

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/support-tickets/${ticket.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminReply }),
      });
      showToast('success', '저장되었습니다.');
      onChanged();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '저장 실패');
      setSaving(false);
    }
  };

  const handleSendReply = async () => {
    if (!adminReply.trim()) {
      showToast('error', '답변 내용을 먼저 입력하세요.');
      return;
    }
    if (!window.confirm('신청자에게 답변 이메일을 보내시겠습니까?')) return;
    setSending(true);
    try {
      await apiFetch(`/support-tickets/${ticket.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminReply, sendReply: true }),
      });
      showToast('success', '답변을 전송했습니다.');
      onChanged();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '답변 전송 실패');
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`"${ticket.subject}" 문의를 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      await apiFetch(`/support-tickets/${ticket.id}`, { method: 'DELETE' });
      showToast('success', '삭제되었습니다.');
      onChanged();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
      setDeleting(false);
    }
  };

  const Row = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="flex gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="w-20 shrink-0 text-xs font-medium text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 break-all">{value ?? <span className="text-gray-300">—</span>}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold">{ticket.subject}</h3>
            <SupportStatusBadge status={ticket.status} />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        {/* Read-only 정보 */}
        <div className="rounded-lg bg-gray-50 px-4 py-2 mb-4">
          <Row label="교회" value={ticket.tenantSlug ? <span className="font-mono">{ticket.tenantSlug}</span> : null} />
          <Row label="이름" value={ticket.name} />
          <Row label="이메일" value={ticket.email} />
          <Row label="접수일" value={formatDate(ticket.createdAt)} />
        </div>

        {/* 문의 내용 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1">문의 내용</label>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap break-words">
            {ticket.message}
          </div>
        </div>

        {/* 상태 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">상태</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SupportStatus)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {SUPPORT_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{SUPPORT_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* 답변 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">답변</label>
          <textarea
            value={adminReply}
            onChange={(e) => setAdminReply(e.target.value)}
            rows={5}
            placeholder="신청자에게 보낼 답변을 입력하세요."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={handleSendReply}
            disabled={busy}
            className="flex-1 min-w-[8rem] bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {sending ? '전송 중...' : '답변 보내기'}
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
