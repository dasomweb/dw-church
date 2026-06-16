/**
 * Tenant Danger Zone — destructive operations gated behind explicit
 * confirmation. Existing endpoints (PUT /admin/tenants/:id with isActive,
 * DELETE /admin/tenants/:id) already work; this just gives them a real
 * surface inside the per-tenant console so super-admins don't have to
 * bounce back to the list view.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../components';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';

export default function TenantDangerZone() {
  const session = useAuthStore((s) => s.session);
  const { tenant, refresh } = useSuperAdminTenant();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const baseUrl = host.startsWith('admin.')
    ? `https://api.${host.replace('admin.', '')}`
    : (import.meta.env.VITE_API_BASE_URL as string) || '';
  const headers = {
    Authorization: `Bearer ${session?.accessToken ?? ''}`,
    'Content-Type': 'application/json',
  };

  const toggleActive = async () => {
    if (!tenant || busy) return;
    const action = tenant.isActive ? '비활성화' : '활성화';
    if (!window.confirm(`"${tenant.name}" 을(를) ${action} 하시겠습니까?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${tenant.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', `${action} 완료`);
      await refresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : `${action} 실패`);
    } finally {
      setBusy(false);
    }
  };

  const deleteTenant = async () => {
    if (!tenant || busy) return;
    if (deleteConfirmText !== tenant.slug) {
      showToast('error', `확인을 위해 slug "${tenant.slug}" 를 정확히 입력하세요.`);
      return;
    }
    if (!window.confirm(`정말로 "${tenant.name}" 을(를) 영구 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며 테넌트의 모든 데이터(스키마, R2 파일, 사용자, 도메인) 가 함께 삭제됩니다.`)) return;
    setBusy(true);
    try {
      // DELETE has no body — DON'T send Content-Type: application/json or
      // Fastify rejects the empty body with FST_ERR_CTP_EMPTY_JSON_BODY (400).
      // Send the auth header only.
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/${tenant.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.accessToken ?? ''}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', '삭제 완료');
      navigate('/super-admin');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setBusy(false);
    }
  };

  if (!tenant) {
    return <div className="p-6 text-sm text-gray-500">테넌트 정보 로딩 중...</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-red-700">위험구역</h1>
        <p className="text-sm text-gray-500 mt-1">
          되돌릴 수 없는 작업. 신중하게 실행하세요.
        </p>
      </div>

      {/* Deactivate */}
      <section className="rounded-xl border border-amber-300 bg-amber-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-amber-900">{tenant.isActive ? '테넌트 비활성화' : '테넌트 활성화'}</h2>
            <p className="mt-1 text-xs text-amber-800">
              {tenant.isActive
                ? '비활성화하면 사이트가 접속 불가가 되고 어드민도 로그인할 수 없습니다. 데이터는 보존됩니다.'
                : '활성화하면 사이트와 어드민에 다시 접속할 수 있습니다.'}
            </p>
          </div>
          <button
            onClick={toggleActive}
            disabled={busy}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap disabled:opacity-50 ${
              tenant.isActive
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {busy ? '...' : tenant.isActive ? '비활성화' : '활성화'}
          </button>
        </div>
      </section>

      {/* Delete */}
      <section className="rounded-xl border border-red-300 bg-red-50 p-5">
        <h2 className="text-sm font-semibold text-red-900">테넌트 영구 삭제</h2>
        <p className="mt-1 text-xs text-red-800">
          데이터베이스 스키마 (<code className="font-mono">tenant_{tenant.slug}</code>), R2 파일, 사용자, 도메인이 모두 삭제됩니다. 복구 불가능.
        </p>
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-medium text-red-900">
            확인을 위해 slug 를 입력하세요: <code className="font-mono">{tenant.slug}</code>
          </label>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            disabled={busy}
            className="w-full px-3 py-1.5 border border-red-300 rounded text-sm font-mono disabled:opacity-50"
            placeholder={tenant.slug}
          />
        </div>
        <button
          onClick={deleteTenant}
          disabled={busy || deleteConfirmText !== tenant.slug}
          className="mt-3 w-full py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? '삭제 중...' : '영구 삭제'}
        </button>
      </section>
    </div>
  );
}
