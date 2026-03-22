import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useDomains,
  useAddDomain,
  useRemoveDomain,
  useVerifyDomain,
} from '@dw-church/api-client';
import { useAuthStore } from '../stores/auth';

interface DomainFormData {
  domain: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '대기 중',
  active: '활성',
  failed: '실패',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default function DomainSettings() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const session = useAuthStore((s) => s.session);
  const tenantSlug = session?.user?.tenantSlug || '';

  const { data: domains, isLoading } = useDomains();
  const addDomainMutation = useAddDomain();
  const removeDomainMutation = useRemoveDomain();
  const verifyDomainMutation = useVerifyDomain();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DomainFormData>();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const onSubmit = async (data: DomainFormData) => {
    try {
      await addDomainMutation.mutateAsync(data.domain.toLowerCase().trim());
      showToast('도메인이 추가되었습니다.', 'success');
      reset();
    } catch {
      showToast('도메인 추가에 실패했습니다.', 'error');
    }
  };

  const handleRemove = (id: string, domain: string) => {
    if (window.confirm(`"${domain}" 도메인을 삭제하시겠습니까?`)) {
      removeDomainMutation.mutate(id, {
        onSuccess: () => showToast('도메인이 삭제되었습니다.', 'success'),
        onError: () => showToast('삭제에 실패했습니다.', 'error'),
      });
    }
  };

  const handleVerify = (id: string) => {
    verifyDomainMutation.mutate(id, {
      onSuccess: (result) => {
        if (result.status === 'active') {
          showToast('DNS 확인 완료! 도메인이 활성화되었습니다.', 'success');
        } else {
          showToast('DNS 설정이 아직 확인되지 않았습니다. CNAME 레코드를 확인해주세요.', 'error');
        }
      },
      onError: () => showToast('확인에 실패했습니다.', 'error'),
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      <h2 className="text-lg font-bold mb-6">도메인 설정</h2>

      {/* Current subdomain */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-bold mb-2">기본 주소</h3>
        <div className="flex items-center gap-2">
          <span className="px-3 py-2 bg-gray-50 border rounded text-sm font-mono text-gray-700">
            {tenantSlug}.dasomchurch.org
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
            활성
          </span>
        </div>
      </div>

      {/* DNS Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-bold text-blue-900 mb-2">커스텀 도메인 연결 방법</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>도메인 DNS 설정 페이지로 이동하세요</li>
          <li>CNAME 레코드를 추가하세요: <code className="px-1 py-0.5 bg-blue-100 rounded font-mono text-xs">cname.vercel-dns.com</code></li>
          <li>아래에 도메인을 입력하고 "도메인 추가"를 클릭하세요</li>
          <li>"확인" 버튼을 클릭하여 DNS 설정을 확인하세요</li>
        </ol>
      </div>

      {/* Add domain form */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-bold mb-3">커스텀 도메인 추가</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3">
          <div className="flex-1">
            <input
              {...register('domain', {
                required: '도메인을 입력하세요',
                pattern: {
                  value: /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i,
                  message: '올바른 도메인 형식을 입력하세요 (예: example.com)',
                },
              })}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="example.com"
            />
            {errors.domain && (
              <p className="text-red-500 text-xs mt-1">{errors.domain.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={addDomainMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {addDomainMutation.isPending ? '추가 중...' : '도메인 추가'}
          </button>
        </form>
      </div>

      {/* Domain list */}
      {isLoading && <p className="text-sm text-gray-500">로딩 중...</p>}

      {domains && domains.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-sm font-medium">도메인</th>
                <th className="text-left px-4 py-3 text-sm font-medium">상태</th>
                <th className="text-left px-4 py-3 text-sm font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{d.domain}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerify(d.id)}
                        disabled={verifyDomainMutation.isPending}
                        className="text-blue-600 hover:underline text-xs disabled:opacity-50"
                      >
                        확인
                      </button>
                      <button
                        onClick={() => handleRemove(d.id, d.domain)}
                        disabled={removeDomainMutation.isPending}
                        className="text-red-600 hover:underline text-xs disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {domains && domains.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
          등록된 커스텀 도메인이 없습니다
        </div>
      )}
    </div>
  );
}
