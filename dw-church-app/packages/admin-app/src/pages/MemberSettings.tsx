import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, useToast } from '../components';

/**
 * 교적 설정 (SE) — 교단별 동작을 켜고, 그에 따라 교적부 입력 필드·표현이 바뀐다.
 *  - 타 교회 성례 인정 관리: 성례 등록의 '본 교회 인정' 체크 + '미인정' 표시 노출
 *  - 직분 요건 성례: 지정 성례(예: 침례)를 인정받아야 직분 자격 → 교인 상세에 충족/미충족
 *  - 기본 세례 용어 / 본교회·타교회 직분 구분 사용
 */
type Settings = Record<string, any>;

export default function MemberSettings() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();

  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  const settingsQ = useQuery({
    queryKey: ['member-settings'],
    queryFn: async () => (await api.get<{ data: Settings }>('/api/v1/member-settings') as any).data as Settings,
  });
  const codesQ = useQuery({
    queryKey: ['member-codes'],
    queryFn: async () => (await api.get<{ data: any[] }>('/api/v1/member-codes') as any).data as any[],
  });
  const sacTypes = useMemo(
    () => (codesQ.data ?? []).filter((c) => c.category === 'sacrament_type' && c.isActive !== false).map((c) => c.label as string),
    [codesQ.data],
  );

  useEffect(() => {
    if (settingsQ.data && !form) {
      setForm({
        recognitionEnabled: settingsQ.data.recognitionEnabled ?? true,
        requireForOffice: settingsQ.data.requireForOffice ?? false,
        requiredSacraments: settingsQ.data.requiredSacraments ?? [],
        defaultBaptismTerm: settingsQ.data.defaultBaptismTerm ?? '세례',
        positionDistinction: settingsQ.data.positionDistinction ?? true,
      });
    }
  }, [settingsQ.data, form]);

  if (settingsQ.isLoading || !form) return <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div>;
  const set = (k: string, v: any) => setForm((f) => ({ ...(f as Settings), [k]: v }));
  const toggleReq = (label: string) => {
    const cur: string[] = form.requiredSacraments ?? [];
    set('requiredSacraments', cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/member-settings', form);
      showToast('success', '교적 설정을 저장했습니다.');
    } catch (e: any) { showToast('error', e?.message || '저장 실패'); }
    finally { setSaving(false); }
  };

  const Card = ({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      <p className="text-xs text-gray-500 mt-1 mb-3">{desc}</p>
      {children}
    </div>
  );
  const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="rounded" /> {label}
    </label>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">교적 설정</h1>
        <p className="text-sm text-gray-500 mt-1">교단·교회 방침에 맞게 켜면 교인·성례 입력 화면과 표시가 따라 바뀝니다.</p>
      </div>

      <Card title="타 교회 성례 인정 관리" desc="타 교단에서 받은 세례 등을 본 교회가 인정/불인정으로 기록합니다. 끄면 성례 등록의 '본 교회 인정' 항목과 '미인정' 표시가 숨겨집니다.">
        <Toggle on={form.recognitionEnabled} onChange={(v) => set('recognitionEnabled', v)} label="성례 인정 관리 사용" />
      </Card>

      <Card title="직분 요건 성례" desc="특정 성례(예: 침례)를 인정받은 교인만 직분 자격이 있는 교회(침례교 등)를 위한 설정입니다. 켜면 교인 상세에 '직분 요건 충족/미충족'이 표시됩니다.">
        <Toggle on={form.requireForOffice} onChange={(v) => set('requireForOffice', v)} label="직분에 요건 성례 적용" />
        {form.requireForOffice && (
          <div className="mt-3 pl-1">
            <p className="text-xs text-gray-500 mb-2">요건으로 인정할 성례를 고르세요 (하나라도 인정받으면 충족):</p>
            <div className="flex flex-wrap gap-2">
              {sacTypes.length === 0 ? <span className="text-xs text-gray-400">성례유형 코드가 없습니다. 교적 코드 &gt; 성례유형에서 추가하세요.</span> :
                sacTypes.map((t) => {
                  const on = (form.requiredSacraments ?? []).includes(t);
                  return <button key={t} type="button" onClick={() => toggleReq(t)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{t}</button>;
                })}
            </div>
          </div>
        )}
      </Card>

      <Card title="기본 세례 용어" desc="교인·성례 입력 시 기본으로 선택되는 성례 용어입니다. 침례교는 '침례'로 두세요.">
        <select className={`${inputClass} sm:w-52`} value={form.defaultBaptismTerm} onChange={(e) => set('defaultBaptismTerm', e.target.value)}>
          {(sacTypes.length ? sacTypes : ['세례', '침례']).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Card>

      <Card title="직분 구분" desc="본 교회에서 임명한 직분과 타 교회에서 받은 직분을 구분해 입력·표시합니다. 끄면 교인 폼의 '타 교회에서 받은 직분' 항목이 숨겨집니다.">
        <Toggle on={form.positionDistinction} onChange={(v) => set('positionDistinction', v)} label="본 교회 / 타 교회 직분 구분 사용" />
      </Card>

      <div>
        <button disabled={saving} onClick={() => void save()} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? '저장 중…' : '설정 저장'}</button>
      </div>
    </div>
  );
}
