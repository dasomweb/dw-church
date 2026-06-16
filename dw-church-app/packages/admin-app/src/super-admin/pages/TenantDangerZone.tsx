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
  // Two-step confirmation (Vercel-style): the operator must type BOTH the
  // tenant slug AND a fixed phrase before the delete button arms. Two distinct
  // inputs make an accidental/auto-filled deletion essentially impossible.
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePhraseText, setDeletePhraseText] = useState('');
  const DELETE_PHRASE = '테넌트를 영구 삭제합니다';

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
    // Defensive — the button is already disabled until both inputs match, but
    // re-check so a programmatic call can't bypass the two-step confirmation.
    if (deleteConfirmText !== tenant.slug || deletePhraseText !== DELETE_PHRASE) {
      showToast('error', '확인 입력이 일치하지 않습니다.');
      return;
    }
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

  // Both confirmations must match exactly before the delete button arms.
  const slugMatches = deleteConfirmText === tenant.slug;
  const phraseMatches = deletePhraseText === DELETE_PHRASE;
  const canDelete = slugMatches && phraseMatches;

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

      {/* Delete — two-step confirmation (slug + fixed phrase) */}
      <section className="rounded-xl border border-red-300 bg-red-50 p-5">
        <h2 className="text-sm font-semibold text-red-900">테넌트 영구 삭제</h2>
        <p className="mt-1 text-xs text-red-800">
          데이터베이스 스키마 (<code className="font-mono">tenant_{tenant.slug}</code>), R2 파일, 사용자, 도메인이 모두 삭제됩니다. 복구 불가능.
        </p>

        {/* Confirm 1 — tenant slug */}
        <div className="mt-4 space-y-1.5">
          <label className="block text-xs text-red-900">
            확인을 위해 <span className="font-mono font-bold">{tenant.slug}</span> 를 입력하세요
          </label>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            disabled={busy}
            className={`w-full px-3 py-2 rounded-lg text-sm font-mono outline-none disabled:opacity-50 ${
              slugMatches ? 'border border-red-300 focus:border-red-500' : 'border-2 border-red-400 bg-white'
            }`}
            placeholder={tenant.slug}
            autoComplete="off"
            spellCheck={false}
          />
          {!slugMatches && (
            <p className="flex items-center gap-1 text-[11px] text-red-600">
              <span aria-hidden>⊘</span> “{tenant.slug}” 입력이 필요합니다
            </p>
          )}
        </div>

        {/* Confirm 2 — fixed phrase */}
        <div className="mt-4 space-y-1.5">
          <label className="block text-xs text-red-900">
            확인을 위해 <span className="font-bold">{DELETE_PHRASE}</span> 를 입력하세요
          </label>
          <input
            type="text"
            value={deletePhraseText}
            onChange={(e) => setDeletePhraseText(e.target.value)}
            disabled={busy}
            className={`w-full px-3 py-2 rounded-lg text-sm outline-none disabled:opacity-50 ${
              phraseMatches ? 'border border-red-300 focus:border-red-500' : 'border-2 border-red-400 bg-white'
            }`}
            placeholder={DELETE_PHRASE}
            autoComplete="off"
            spellCheck={false}
          />
          {!phraseMatches && (
            <p className="flex items-center gap-1 text-[11px] text-red-600">
              <span aria-hidden>⊘</span> “{DELETE_PHRASE}” 입력이 필요합니다
            </p>
          )}
        </div>

        {/* Irreversible warning banner */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2.5 text-xs font-medium text-red-700">
          <span aria-hidden>⚠️</span>
          <span>{tenant.name} 삭제는 되돌릴 수 없습니다.</span>
        </div>

        <button
          onClick={deleteTenant}
          disabled={busy || !canDelete}
          className="mt-4 w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? '삭제 중...' : '테넌트 영구 삭제'}
        </button>
      </section>
    </div>
  );
}
