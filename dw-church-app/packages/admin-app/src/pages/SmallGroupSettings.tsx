import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, useToast } from '../components';

/**
 * SG-01 운영 모델 설정 — 스몰그룹 애드온의 프리셋(엔진 하나 + 운영모델 4종).
 *  · 모델 선택(A 가정교회 · B 구역 · C 셀 · D 사역별) → 용어·계층·규칙 기본값을 불러옴
 *  · 용어 개별 수정 (조직/리더/부리더/구성원/모임/리포트/찾기 명칭)
 *  · 계층 단계(최대 3단)와 각 단계 리더 호칭·필수 여부
 *  · 중복 소속 허용 (모델 D 는 기본 허용)
 * 프리셋은 표를 바꾸지 않고 라벨·규칙만 바꾼다.
 */
type Preset = Record<string, any>;
const TERM_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: 'org', label: '조직 (단수)', hint: '목장 / 구역 / 셀 / 모임' },
  { key: 'leader', label: '리더', hint: '목자 / 구역장 / 셀리더 / 리더' },
  { key: 'subleader', label: '부리더', hint: '목녀 / 부구역장 …' },
  { key: 'member', label: '구성원', hint: '목원 / 구역원 / 셀원 / 회원' },
  { key: 'meeting', label: '모임', hint: '모임 / 구역 예배 …' },
  { key: 'report', label: '리포트 명칭', hint: '목장 리포트 …' },
  { key: 'finder', label: '공개 찾기', hint: '목장 찾기 …' },
];

export default function SmallGroupSettings() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState<Preset | null>(null);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  const presetQ = useQuery({
    queryKey: ['group-preset'],
    queryFn: async () => (await api.get<{ data: Preset }>('/api/v1/group-preset') as any).data as Preset,
  });

  useEffect(() => {
    if (presetQ.data && !form) setForm(structuredClone(presetQ.data));
  }, [presetQ.data, form]);

  if (presetQ.isLoading || !form) return <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div>;

  const setTerm = (k: string, v: string) => setForm((f) => ({ ...(f as Preset), terminology: { ...(f as Preset).terminology, [k]: v } }));
  const setLevel = (idx: number, k: string, v: any) =>
    setForm((f) => {
      const defs = [...((f as Preset).levelDefs ?? [])];
      defs[idx] = { ...defs[idx], [k]: v };
      return { ...(f as Preset), levelDefs: defs };
    });
  const addLevel = () =>
    setForm((f) => {
      const defs = [...((f as Preset).levelDefs ?? [])];
      if (defs.length >= 3) return f as Preset;
      defs.push({ level: defs.length + 1, name: '', leaderTitle: '', leaderRequired: false });
      return { ...(f as Preset), levelDefs: defs };
    });
  const removeLevel = (idx: number) =>
    setForm((f) => {
      const defs = ((f as Preset).levelDefs ?? []).filter((_: any, i: number) => i !== idx).map((d: any, i: number) => ({ ...d, level: i + 1 }));
      return { ...(f as Preset), levelDefs: defs };
    });

  // 다른 모델 기본값으로 초기화 — 용어·계층·규칙 전체를 갈아끼운다(입력한 조직 데이터는 그대로).
  const applyModel = async (model: string) => {
    if (!window.confirm(`${model} 모델 기본값으로 용어·계층·규칙을 초기화할까요? 이미 등록한 조직·명단은 유지됩니다.`)) return;
    setApplying(true);
    try {
      const next = (await api.post<{ data: Preset }>('/api/v1/group-preset/apply', { model }) as any).data as Preset;
      setForm(structuredClone(next));
      qc.invalidateQueries({ queryKey: ['group-preset'] });
      showToast('success', '운영 모델 기본값을 적용했습니다.');
    } catch (e: any) { showToast('error', e?.message || '적용 실패'); }
    finally { setApplying(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/group-preset', {
        terminology: form.terminology,
        levelDefs: form.levelDefs,
        allowMulti: form.allowMulti,
        isConfigured: true,
      });
      qc.invalidateQueries({ queryKey: ['group-preset'] });
      showToast('success', '스몰그룹 설정을 저장했습니다.');
    } catch (e: any) { showToast('error', e?.message || '저장 실패'); }
    finally { setSaving(false); }
  };

  const models: { model: string; label: string }[] = form.models ?? [];
  const t = form.terminology ?? {};

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">스몰그룹 설정</h1>
        <p className="text-sm text-gray-500 mt-1">교회 조직 운영 방식을 고르면 용어와 계층이 그에 맞게 바뀝니다. 세부 명칭은 직접 고칠 수 있습니다.</p>
      </div>

      {/* 운영 모델 선택 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800">운영 모델</h2>
        <p className="text-xs text-gray-500 mt-1 mb-3">현재 모델: <b>{form.model}</b> · 다른 모델을 누르면 그 기본값(용어·계층·리포트·과정)으로 초기화됩니다.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {models.map((m) => (
            <button key={m.model} type="button" disabled={applying} onClick={() => void applyModel(m.model)}
              className={`text-left px-4 py-3 rounded-lg border transition ${form.model === m.model ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
              <span className="flex items-center gap-2">
                <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center ${form.model === m.model ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{m.model}</span>
                <b className="text-sm text-gray-800">{m.label}</b>
                {form.model === m.model && <span className="ml-auto text-[11px] text-blue-600">사용 중</span>}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 용어 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800">용어</h2>
        <p className="text-xs text-gray-500 mt-1 mb-3">화면 곳곳에 이 용어로 표기됩니다.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TERM_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs font-medium text-gray-600">{f.label}</span>
              <input className={inputClass} value={t[f.key] ?? ''} placeholder={f.hint} onChange={(e) => setTerm(f.key, e.target.value)} />
            </label>
          ))}
        </div>
      </div>

      {/* 계층 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">계층 구조</h2>
            <p className="text-xs text-gray-500 mt-1">위에서 아래로 상위→하위 (최대 3단). 리더 호칭과 필수 여부를 정합니다.</p>
          </div>
          {(form.levelDefs?.length ?? 0) < 3 && (
            <button type="button" onClick={addLevel} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ 단계 추가</button>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {(form.levelDefs ?? []).map((d: any, idx: number) => (
            <div key={idx} className="flex flex-wrap items-end gap-2 bg-gray-50 rounded-lg p-3">
              <span className="text-xs font-bold text-gray-400 w-10">L{d.level}</span>
              <label className="flex-1 min-w-[120px]">
                <span className="text-[11px] text-gray-500">단계 이름</span>
                <input className={inputClass} value={d.name ?? ''} placeholder="예: 목장" onChange={(e) => setLevel(idx, 'name', e.target.value)} />
              </label>
              <label className="flex-1 min-w-[120px]">
                <span className="text-[11px] text-gray-500">리더 호칭</span>
                <input className={inputClass} value={d.leaderTitle ?? ''} placeholder="예: 목자" onChange={(e) => setLevel(idx, 'leaderTitle', e.target.value)} />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 pb-2">
                <input type="checkbox" checked={!!d.leaderRequired} onChange={(e) => setLevel(idx, 'leaderRequired', e.target.checked)} className="rounded" /> 리더 필수
              </label>
              <button type="button" onClick={() => removeLevel(idx)} className="text-xs text-gray-400 hover:text-red-600 pb-2">삭제</button>
            </div>
          ))}
        </div>
      </div>

      {/* 규칙 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800">소속 규칙</h2>
        <label className="flex items-center gap-2 text-sm cursor-pointer mt-3">
          <input type="checkbox" checked={!!form.allowMulti} onChange={(e) => setForm((f) => ({ ...(f as Preset), allowMulti: e.target.checked }))} className="rounded" />
          한 사람이 여러 조직에 동시에 소속될 수 있음
        </label>
        <p className="text-xs text-gray-400 mt-1.5 pl-6">끄면(대부분의 목장·구역·셀) 새 조직에 배정할 때 기존 소속이 자동으로 종료됩니다. 켜면(사역별 모임) 여러 곳에 동시 소속됩니다.</p>
      </div>

      <div>
        <button disabled={saving} onClick={() => void save()} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? '저장 중…' : '설정 저장'}</button>
      </div>
    </div>
  );
}
