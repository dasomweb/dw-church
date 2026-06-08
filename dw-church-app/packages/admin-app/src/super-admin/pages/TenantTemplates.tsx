// Tenant page templates — super-admin > 템플릿. Lists the built-in page
// templates (GET /api/v1/pages/templates) and creates a new page from one
// (POST /api/v1/pages/from-template). Replaces the SuperAdminPlaceholder.
// super_admin bypasses the Pro+ gate on from-template.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDWChurchClient } from '@dw-church/api-client';
import { useToast } from '../../components';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';

interface TemplateRow {
  key: string;
  label: string;
  description: string;
  sectionCount: number;
}

function slugify(s: string): string {
  return s.trim().toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || `page-${Math.random().toString(36).slice(2, 6)}`;
}

export default function TenantTemplates() {
  const client = useDWChurchClient();
  const navigate = useNavigate();
  const { tenant } = useSuperAdminTenant();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<TemplateRow | null>(null);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const res = await client.adapter.get<{ data: TemplateRow[] }>('/api/v1/pages/templates');
      setTemplates(res?.data ?? []);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '템플릿을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [client, showToast]);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    if (!client || !active || !title.trim()) return;
    setCreating(true);
    try {
      const page = await client.adapter.post<{ id?: string } | { data?: { id?: string } }>(
        '/api/v1/pages/from-template',
        { template: active.key, pageTitle: title.trim(), pageSlug: slugify(title) },
      );
      void page;
      showToast('success', `"${title.trim()}" 페이지가 생성되었습니다`);
      setActive(null);
      setTitle('');
      // Jump to the page builder to edit the new page.
      navigate(`/super-admin/t/${tenant?.slug}/pages`);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '페이지 생성 실패');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">페이지 템플릿</h1>
        <p className="text-xs text-gray-500 mt-0.5">미리 구성된 페이지 레이아웃으로 새 페이지를 빠르게 만듭니다. 생성 후 페이지 빌더에서 편집하세요.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-gray-500">불러오는 중…</div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center text-sm text-gray-400">사용 가능한 템플릿이 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.key} className="flex flex-col rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold text-gray-900">{t.label}</h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{t.sectionCount}개 섹션</span>
              </div>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-gray-600">{t.description}</p>
              <button
                type="button"
                onClick={() => { setActive(t); setTitle(t.label); }}
                className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                이 템플릿으로 페이지 만들기
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !creating && setActive(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900">새 페이지: {active.label}</h3>
            <p className="mt-1 text-xs text-gray-500">{active.description}</p>
            <label className="mt-4 block">
              <span className="text-xs font-medium text-gray-600">페이지 제목</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="예: 교회 소개"
              />
            </label>
            <p className="mt-1 text-[10px] text-gray-400">주소: /{slugify(title || active.label)}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setActive(null)} disabled={creating}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">취소</button>
              <button type="button" onClick={create} disabled={creating || !title.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                {creating ? '생성 중…' : '페이지 만들기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
