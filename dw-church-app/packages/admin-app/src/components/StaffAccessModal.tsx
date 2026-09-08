import { useEffect, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, useToast } from './index';
import { CAP_GROUPS, CAP_LABELS, CAP_HINTS, CAP_COMING_SOON, type Capability } from '../lib/capabilities';

// 교적 멤버 → Staff 지정 모달. 체크박스로 권한(capability)을 부여하고 로그인 계정을
// 생성/연결한다. 오너/관리자만 사용(서버 requireAdmin). 목자=group_report 만 주면
// 자기 목장 리포트만, 새가족 담당자=newcomer 만 주면 새가족만 보이게 된다.

interface StaffAccess { userId: string; email: string; role: string; isActive: boolean; permissions: Capability[] }

export function StaffAccessModal({
  memberId, memberName, defaultEmail, onClose, onSaved,
}: {
  memberId: string;
  memberName: string;
  defaultEmail?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const api = useDWChurchClient()!.adapter;
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<StaffAccess | null>(null);
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [selected, setSelected] = useState<Set<Capability>>(new Set());
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = (await api.get<{ data: StaffAccess | null }>(`/api/v1/members/${memberId}/staff-access`)) as any;
        const data: StaffAccess | null = res.data ?? null;
        if (!alive) return;
        setExisting(data);
        if (data) {
          setEmail(data.email);
          setSelected(new Set(data.permissions));
        }
      } catch {
        /* 없으면 신규 지정 */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [api, memberId]);

  const toggle = (cap: Capability) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cap)) next.delete(cap); else next.add(cap);
      return next;
    });
  };

  const save = async () => {
    if (selected.size === 0) { showToast('error', '권한을 하나 이상 선택하세요.'); return; }
    if (!email.trim()) { showToast('error', '로그인 이메일을 입력하세요.'); return; }
    setSaving(true);
    try {
      const res = (await api.post<{ data: { created: boolean; tempPassword?: string } }>(
        `/api/v1/members/${memberId}/staff-access`,
        { permissions: Array.from(selected), email: email.trim() },
      )) as any;
      const result = res.data ?? res;
      if (result?.tempPassword) {
        setTempPassword(result.tempPassword);
        showToast('success', '스태프 계정을 만들었습니다. 임시 비밀번호를 전달하세요.');
      } else {
        showToast('success', '권한을 저장했습니다.');
      }
      onSaved?.();
      if (!result?.tempPassword) onClose();
    } catch (e: any) {
      showToast('error', e?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm(`${memberName} 님의 스태프 권한을 해제할까요? (로그인이 차단됩니다)`)) return;
    setSaving(true);
    try {
      await api.delete(`/api/v1/members/${memberId}/staff-access`);
      showToast('success', '스태프 권한을 해제했습니다.');
      onSaved?.();
      onClose();
    } catch (e: any) {
      showToast('error', e?.message || '해제 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">스태프 권한 — {memberName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="닫기">✕</button>
        </div>
        <p className="mb-4 text-xs text-gray-500">
          이 교인을 스태프로 지정하고, 접근할 수 있는 기능을 선택하세요. 저장하면 로그인 계정이 만들어지거나 갱신됩니다.
        </p>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">불러오는 중…</div>
        ) : tempPassword ? (
          // 신규 계정 생성 결과 — 임시 비밀번호 안내
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-bold text-green-800">스태프 계정이 생성되었습니다.</p>
              <p className="mt-2 text-sm text-gray-700">아래 정보를 본인에게 전달하세요. 첫 로그인 후 비밀번호를 변경하도록 안내해 주세요.</p>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between rounded-lg bg-white px-3 py-2"><span className="text-gray-500">이메일</span><span className="font-bold text-gray-900">{email}</span></div>
                <div className="flex justify-between rounded-lg bg-white px-3 py-2"><span className="text-gray-500">임시 비밀번호</span><span className="font-mono font-bold text-blue-700">{tempPassword}</span></div>
              </div>
            </div>
            <button onClick={onClose} className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">확인</button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">로그인 이메일</label>
              <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@example.com" />
              <p className="mt-1 text-xs text-gray-400">교인 정보의 이메일이 기본값입니다. 로그인 아이디로 사용됩니다.</p>
            </div>

            {CAP_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{group.label}</p>
                <div className="space-y-2">
                  {group.caps.map((cap) => {
                    const soon = CAP_COMING_SOON.includes(cap);
                    return (
                      <label key={cap} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selected.has(cap) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                          checked={selected.has(cap)}
                          onChange={() => toggle(cap)}
                        />
                        <span className="min-w-0">
                          <span className="text-sm font-bold text-gray-800">
                            {CAP_LABELS[cap]}
                            {soon && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">예정</span>}
                          </span>
                          <span className="mt-0.5 block text-xs text-gray-500">{CAP_HINTS[cap]}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-between">
              {existing && existing.isActive ? (
                <button onClick={revoke} disabled={saving} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">권한 해제</button>
              ) : <span />}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">취소</button>
                <button onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? '저장 중…' : existing ? '권한 저장' : '스태프로 지정'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
