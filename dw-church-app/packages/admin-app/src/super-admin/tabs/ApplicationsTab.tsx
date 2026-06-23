import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner, EmptyState } from '../shared/admin-ui';
import { formatDate } from '../shared/format';
import { PLAN_COLORS } from '../shared/constants';
import type { Application, ApplicationStatus } from '../shared/types';

// ═══════════════════════════════════════════════════════════
// ─── Tab: Applications (신청서 — website-build inbox) ──────
// ═══════════════════════════════════════════════════════════
// 개척/사역 유형 코드 → 한국어 라벨 (Send Network 모델).
const PLANTING_LABELS: Record<string, string> = {
  standard: '전통/표준 개척', covocational: '자비량/이중직(미자립)', multisite: '다중 사이트',
  multiethnic: '다민족/다언어', replant: '교회 재개척', micro: '마이크로/가정교회', other: '기타',
};

// 이단 대조 상태 배지 — recognized(정규)/watch(확인필요)/cult(이단)/null(미확인).
// denominationVerified 가 true 면 슈퍼어드민이 직접 "정통 교단" 확인한 것이므로
// 상태와 무관하게 "확인됨" 표시를 함께 노출한다.
function DenominationBadge({
  status,
  verified,
}: {
  status: 'recognized' | 'watch' | 'cult' | null;
  verified?: boolean;
}) {
  const map: Record<'recognized' | 'watch' | 'cult', { label: string; cls: string }> = {
    recognized: { label: '✓ 정규 교단', cls: 'bg-green-100 text-green-700' },
    cult: { label: '🚩 이단 의심', cls: 'bg-red-100 text-red-700' },
    watch: { label: '? 확인 필요', cls: 'bg-amber-100 text-amber-700' },
  };
  const fallback = { label: '미확인', cls: 'bg-gray-100 text-gray-600' };
  const entry = status ? map[status] : fallback;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${entry.cls}`}>
        {entry.label}
      </span>
      {verified && (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          ✓ 확인됨
        </span>
      )}
    </span>
  );
}

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: '신규',
  reviewing: '검토중',
  approved: '승인',
  paid: '결제완료',
  converted: '전환됨',
  rejected: '반려',
};

const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-amber-100 text-amber-700',
  approved: 'bg-indigo-100 text-indigo-700',
  paid: 'bg-green-100 text-green-700',
  converted: 'bg-purple-100 text-purple-700',
  rejected: 'bg-red-100 text-red-700',
};

const APPLICATION_STATUS_ORDER: ApplicationStatus[] = [
  'new',
  'reviewing',
  'approved',
  'paid',
  'converted',
  'rejected',
];

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
        APPLICATION_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {APPLICATION_STATUS_LABELS[status] || status}
    </span>
  );
}


export default function ApplicationsTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [selected, setSelected] = useState<Application | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Application[] } | Application[]>('/applications');
      setApplications(Array.isArray(res) ? res : res.data ?? []);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '신청서 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  // newest-first, then apply the status filter
  const sorted = [...applications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const visible =
    statusFilter === 'all' ? sorted : sorted.filter((a) => a.status === statusFilter);

  const filterTabs: { id: 'all' | ApplicationStatus; label: string }[] = [
    { id: 'all', label: '전체' },
    ...APPLICATION_STATUS_ORDER.map((s) => ({ id: s, label: APPLICATION_STATUS_LABELS[s] })),
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
            message={statusFilter === 'all' ? '아직 신청서가 없습니다' : '해당 상태의 신청서가 없습니다'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 font-medium text-xs">
                  <th className="px-5 py-3">교회명</th>
                  <th className="px-5 py-3">담당자</th>
                  <th className="px-5 py-3">교단</th>
                  <th className="px-5 py-3">플랜</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">신청일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((a, idx) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className={`cursor-pointer hover:bg-blue-50/60 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{a.churchName}</span>
                        <DenominationBadge
                          status={a.denominationStatus}
                          verified={a.denominationVerified}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      <div>{a.contactName}</div>
                      <div className="text-xs text-gray-400">{a.email}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {a.denomination ? (
                        <span className="text-xs">{a.denomination}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {a.plan ? (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            PLAN_COLORS[a.plan] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {a.plan}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                      {a.billingPeriod && (
                        <span className="ml-1 text-xs text-gray-400">{a.billingPeriod}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <ApplicationStatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ApplicationDetailModal
          application={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            void fetchApplications();
          }}
        />
      )}
    </div>
  );
}

function ApplicationDetailModal({
  application,
  onClose,
  onChanged,
}: {
  application: Application;
  onClose: () => void;
  onChanged: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [adminNote, setAdminNote] = useState(application.adminNote ?? '');
  const [paymentLink, setPaymentLink] = useState(application.paymentLink ?? '');
  // 슈퍼어드민이 직접 "정통 교단(이단 아님)" 확인했는지 여부. 저장 시 PATCH 본문에 포함.
  const [denominationVerified, setDenominationVerified] = useState(application.denominationVerified);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Stripe Checkout 링크 자동 생성 중 여부.
  const [generating, setGenerating] = useState(false);

  const busy = saving || sending || deleting || generating;

  // 결제 링크 자동 생성 — 서버가 가격(상품/가격 탭의 단일 출처)으로 Stripe
  // Checkout 세션을 만들어 URL 을 반환한다. 생성된 URL 은 결제 링크 필드에만
  // 채워지고, 실제 발송은 운영자가 기존 "결제 링크 보내기"로 진행한다.
  const handleGenerateCheckoutLink = async () => {
    setGenerating(true);
    try {
      // billingPeriod(camelized). 없으면 연간을 기본으로 사용.
      const period = application.billingPeriod ?? 'yearly';
      const res = await apiFetch<{ data: { url: string; application: Application } }>(
        `/applications/${application.id}/checkout-link`,
        { method: 'POST', body: JSON.stringify({ period }) },
      );
      const url = res.data?.url;
      if (url) setPaymentLink(url);
      showToast('success', "결제 링크가 생성되었습니다. '결제 링크 보내기'로 발송하세요.");
    } catch (err) {
      // Stripe 키 미설정(503 / BILLING_NOT_CONFIGURED)이면 친절한 안내를 노출.
      const msg = err instanceof Error ? err.message : '';
      if (/BILLING_NOT_CONFIGURED|503/i.test(msg)) {
        showToast('error', 'Stripe API 키가 아직 설정되지 않았습니다. 키 설정 후 다시 시도하세요.');
      } else {
        showToast('error', msg || '결제 링크 생성 실패');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/applications/${application.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote, paymentLink, denominationVerified }),
      });
      showToast('success', '저장되었습니다.');
      onChanged();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '저장 실패');
      setSaving(false);
    }
  };

  const handleSendPaymentLink = async () => {
    if (!paymentLink.trim()) {
      showToast('error', '결제 링크를 먼저 입력하세요.');
      return;
    }
    if (!window.confirm('신청자에게 결제 링크 이메일을 보내시겠습니까? (상태가 승인으로 변경됩니다)')) return;
    setSending(true);
    try {
      await apiFetch(`/applications/${application.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentLink, sendPaymentLink: true }),
      });
      showToast('success', '결제 링크를 전송했습니다.');
      onChanged();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '결제 링크 전송 실패');
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`"${application.churchName}" 신청서를 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      await apiFetch(`/applications/${application.id}`, { method: 'DELETE' });
      showToast('success', '삭제되었습니다.');
      onChanged();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
      setDeleting(false);
    }
  };

  const Row = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="flex gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="w-24 shrink-0 text-xs font-medium text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 break-all">{value ?? <span className="text-gray-300">—</span>}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold">{application.churchName}</h3>
            <ApplicationStatusBadge status={application.status} />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        {/* 이단 대조 배지 — 모달 상단에 눈에 띄게 노출 */}
        <div className="mb-3">
          <DenominationBadge status={application.denominationStatus} verified={denominationVerified} />
        </div>

        {/* 이단/사이비 경고 — cult 로 분류되었고 아직 확인되지 않은 경우만 */}
        {application.denominationStatus === 'cult' && !denominationVerified && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            🚩 이단/사이비로 의심되는 단체입니다. 승인 전 반드시 확인하세요.
          </div>
        )}

        {/* Read-only details */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-2 mb-4">
          <Row label="담당자" value={application.contactName} />
          <Row label="이메일" value={application.email} />
          <Row label="연락처" value={application.phone} />
          <Row label="교회 주소" value={application.churchAddress} />
          <Row label="소속 교단" value={application.denomination} />
          <Row label="개척/사역 유형" value={application.plantingType ? (PLANTING_LABELS[application.plantingType] || application.plantingType) : null} />
          <Row label="교회 구성원" value={application.memberProfile} />
          <Row label="지역 환경(학군·대학·한인기업 등)" value={application.localContext} />
          <Row label="신앙고백 동의" value={application.faithAffirmed ? '✓ 동의함' : '미동의'} />
          {application.denominationMatch && (
            <Row label="대조 결과" value={`일치: ${application.denominationMatch}`} />
          )}
          <Row
            label="플랜"
            value={
              application.plan
                ? `${application.plan}${application.billingPeriod ? ` (${application.billingPeriod})` : ''}`
                : null
            }
          />
          <Row
            label="기존 사이트"
            value={
              application.existingUrl ? (
                <a
                  href={application.existingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {application.existingUrl}
                </a>
              ) : null
            }
          />
          <Row label="희망 도메인" value={application.desiredDomain} />
          <Row label="메시지" value={application.message ? <span className="whitespace-pre-wrap">{application.message}</span> : null} />
          <Row label="신청일" value={formatDate(application.createdAt)} />
        </div>

        {/* Editable controls */}
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                checked={denominationVerified}
                onChange={(e) => setDenominationVerified(e.target.checked)}
                className="rounded"
              />
              정통 교단 확인 (이단 아님)
            </label>
            <p className="mt-1 text-xs text-gray-400">
              슈퍼어드민이 직접 정통 교단임을 확인한 경우 체크하세요. 저장 시 반영됩니다.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">상태</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {APPLICATION_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {APPLICATION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">관리자 메모</label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="내부 메모 (신청자에게 표시되지 않음)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">결제 링크</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="https://..."
              />
              <button
                type="button"
                onClick={handleGenerateCheckoutLink}
                disabled={busy}
                className="shrink-0 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? '생성 중...' : '결제 링크 자동 생성'}
              </button>
              <button
                type="button"
                onClick={handleSendPaymentLink}
                disabled={busy}
                className="shrink-0 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? '전송 중...' : '결제 링크 보내기'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">'자동 생성'은 상품/가격 탭의 가격으로 Stripe 링크를 만들어 위 칸에 채웁니다. '보내기' 시 신청자에게 이메일이 발송되며 상태가 승인으로 변경됩니다.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-5">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
