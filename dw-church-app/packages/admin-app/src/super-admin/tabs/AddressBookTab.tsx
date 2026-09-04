import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner } from '../shared/admin-ui';

interface Contact {
  id: string;
  email: string;
  name: string;
  tags: string[];
  status: 'subscribed' | 'unsubscribed';
  source: string;
  note: string;
  createdAt: string;
}
interface Stats { total: number; subscribed: number; unsubscribed: number }
interface TagCount { tag: string; count: number }
interface ListResp {
  items: Contact[];
  total: number;
  page: number;
  perPage: number;
  stats: Stats;
  tags: TagCount[];
}

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

export default function AddressBookTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ListResp | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [tag, setTag] = useState('');
  const [page, setPage] = useState(1);

  // add form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newTags, setNewTags] = useState('');
  const [adding, setAdding] = useState(false);

  // import
  const [csv, setCsv] = useState('');
  const [importTags, setImportTags] = useState('');
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (tag) params.set('tag', tag);
      if (status !== 'all') params.set('status', status);
      params.set('page', String(page));
      const res = await apiFetch<{ data: ListResp }>(`/marketing-contacts?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '주소록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast, q, tag, status, page]);

  useEffect(() => { void load(); }, [load]);

  const parseTags = (s: string): string[] =>
    s.split(/[,;]/).map((t) => t.trim()).filter(Boolean);

  const addContact = async () => {
    if (adding) return;
    if (!newEmail.trim()) { showToast('error', '이메일을 입력하세요.'); return; }
    setAdding(true);
    try {
      await apiFetch('/marketing-contacts', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail.trim(), name: newName.trim(), tags: parseTags(newTags) }),
      });
      showToast('success', '연락처를 추가했습니다.');
      setNewEmail(''); setNewName(''); setNewTags('');
      setPage(1);
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '추가 실패');
    } finally {
      setAdding(false);
    }
  };

  const toggleStatus = async (c: Contact) => {
    const next = c.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
    try {
      await apiFetch(`/marketing-contacts/${c.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '변경 실패');
    }
  };

  const remove = async (c: Contact) => {
    if (!window.confirm(`${c.email} 을(를) 삭제할까요?`)) return;
    try {
      await apiFetch(`/marketing-contacts/${c.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const runImport = async () => {
    if (importing) return;
    if (!csv.trim()) { showToast('error', 'CSV 내용을 붙여넣거나 파일을 선택하세요.'); return; }
    setImporting(true);
    try {
      const res = await apiFetch<{ data: { received: number; imported: number; invalid: number; invalidSamples: string[] } }>(
        '/marketing-contacts/import',
        { method: 'POST', body: JSON.stringify({ csv, tags: parseTags(importTags) }) },
      );
      const r = res.data;
      showToast('success', `가져오기 완료 · ${r.imported}건 등록 (읽음 ${r.received}, 무효 ${r.invalid})`);
      setCsv(''); setImportTags(''); setShowImport(false);
      setPage(1);
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '가져오기 실패');
    } finally {
      setImporting(false);
    }
  };

  const stats = data?.stats;
  const tags = data?.tags ?? [];
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.perPage ?? 50;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-5">
      {/* Intro + stats */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-medium text-blue-800">
          이메일 마케팅 발송 대상이 되는 주소록입니다. 직접 추가하거나 외부 주소록(CSV)을 가져올 수 있습니다.
          발송은 &lsquo;이메일 발송&rsquo; 탭에서 &lsquo;주소록&rsquo; 대상을 선택하세요.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '전체', value: stats?.total ?? 0, cls: 'text-gray-900' },
          { label: '구독', value: stats?.subscribed ?? 0, cls: 'text-green-600' },
          { label: '수신거부', value: stats?.unsubscribed ?? 0, cls: 'text-gray-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${s.cls}`}>{s.value.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add + Import actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">연락처 추가</h2>
          <button
            type="button"
            onClick={() => setShowImport((v) => !v)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {showImport ? '가져오기 닫기' : '외부 주소록 가져오기 (CSV)'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputCls} placeholder="이메일 *" />
          <input value={newName} onChange={(e) => setNewName(e.target.value)} className={inputCls} placeholder="이름" />
          <input value={newTags} onChange={(e) => setNewTags(e.target.value)} className={inputCls} placeholder="태그 (쉼표로 구분: nj, 목회자)" />
          <button
            onClick={() => void addContact()}
            disabled={adding}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {adding ? '추가 중...' : '추가'}
          </button>
        </div>

        {showImport && (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs text-gray-500">
              CSV를 붙여넣거나 파일을 선택하세요. 첫 줄에 <code>email, name, tags</code> 헤더가 있으면 자동 인식하고,
              없으면 <b>1열=이메일, 2열=이름, 3열=태그</b>로 읽습니다. 태그는 <code>;</code> 또는 <code>|</code> 로 여러 개.
            </p>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={6}
              className={`${inputCls} font-mono text-xs`}
              placeholder={'email,name,tags\npastor@grace.org,김목사,목회자;nj\ninfo@hope.org,,교회'}
            />
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input type="file" accept=".csv,text/csv,text/plain" onChange={onFile} className="text-sm" />
              <input
                value={importTags}
                onChange={(e) => setImportTags(e.target.value)}
                className={`${inputCls} sm:max-w-xs`}
                placeholder="공통 태그 (예: import-2026)"
              />
              <button
                onClick={() => void runImport()}
                disabled={importing}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {importing ? '가져오는 중...' : '가져오기'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
            className={`${inputCls} sm:flex-1`}
            placeholder="이메일 · 이름 검색"
          />
          <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as typeof status); }} className={`${inputCls} sm:w-40`}>
            <option value="all">전체 상태</option>
            <option value="subscribed">구독</option>
            <option value="unsubscribed">수신거부</option>
          </select>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setPage(1); setTag(''); }}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${tag === '' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              전체 태그
            </button>
            {tags.map((t) => (
              <button
                key={t.tag}
                onClick={() => { setPage(1); setTag(t.tag); }}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${tag === t.tag ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              >
                {t.tag} <span className="opacity-60">{t.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8"><Spinner /></div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">연락처가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">이메일</th>
                  <th className="px-4 py-3 font-medium">이름</th>
                  <th className="px-4 py-3 font-medium">태그</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.email}</td>
                    <td className="px-4 py-3 text-gray-600">{c.name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${c.status === 'subscribed' ? 'text-green-600' : 'text-gray-400'}`}>
                        {c.status === 'subscribed' ? '구독' : '수신거부'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => void toggleStatus(c)} className="text-xs text-gray-500 hover:text-gray-700 mr-3">
                        {c.status === 'subscribed' ? '수신거부' : '구독복원'}
                      </button>
                      <button onClick={() => void remove(c)} className="text-xs text-red-500 hover:text-red-600">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > perPage && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >이전</button>
          <span className="text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >다음</button>
        </div>
      )}
    </div>
  );
}
