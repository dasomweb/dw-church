import { useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../components';
import { useTenantScope } from '../lib/tenant-scope';

// 테넌트 관리자 → 고객지원 문의 제출. POST /support-tickets (requireAuth) →
// 슈퍼어드민 SupportTab(고객지원)에서 관리·답변. 도입 상담(/apply)과 별개.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'https://api.truelight.app';

export default function SupportRequest() {
  const session = useAuthStore((s) => s.session);
  const { slug } = useTenantScope();
  const { showToast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');

  const canSend = subject.trim().length > 0 && message.trim().length > 0 && state !== 'sending';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setState('sending');
    try {
      const res = await fetch(`${API_BASE}/api/v1/support-tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
          ...(slug ? { 'X-Tenant-Slug': slug } : {}),
        },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState('done');
      setSubject(''); setMessage('');
      showToast('success', '문의를 접수했습니다. 확인 후 이메일로 답변드리겠습니다.');
    } catch {
      setState('idle');
      showToast('error', '전송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const input = 'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">고객지원 문의</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">
        사용 중 궁금한 점이나 오류를 남겨 주시면 확인 후 이메일로 답변드립니다. 접수 내용은 관리팀에서 함께 관리합니다.
      </p>

      {state === 'done' && (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
          문의가 접수되었습니다. 확인 후 <b>{session?.user?.email}</b> 로 답변드리겠습니다.
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-800">제목</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={300} className={input} placeholder="예: 설교 영상 썸네일이 안 보여요" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-800">내용</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={7} maxLength={5000} className={input} placeholder="상황을 편하게 적어 주세요. 어느 화면에서, 무엇을 하려다 어떤 일이 있었는지 알려 주시면 빠르게 도와드릴 수 있습니다." />
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-400">답변은 {session?.user?.email || '가입 이메일'} 로 갑니다.</span>
          <button type="submit" disabled={!canSend}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {state === 'sending' ? '보내는 중…' : '문의 보내기'}
          </button>
        </div>
      </form>

      <p className="mt-4 text-xs leading-relaxed text-gray-400">
        급하신 경우 카카오톡·이메일로도 문의하실 수 있습니다. 도움센터의 사용 안내도 함께 참고해 주세요.
      </p>
    </div>
  );
}
