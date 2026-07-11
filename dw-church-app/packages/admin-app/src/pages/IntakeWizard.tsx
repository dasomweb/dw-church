import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';
import { FormField, ImageUpload, useToast, CardSkeleton } from '../components';
import { inputClass, textareaClass } from '../components';

// ─── Intake (초기 콘텐츠 입력 마법사) ───────────────────────────────
// 결제 후 교회가 사이트에 들어갈 내용을 입력하는 고객용 페이지.
// 슈퍼어드민이 이 내용을 받아 AI 빌더로 사이트를 만든다.
//
// HARD RULES 준수:
//   - NO auto-save. 편집은 로컬 state 만 갱신, '저장' 클릭 시에만 서버 write.
//   - 이미지 필드는 반드시 ImageUpload (파일 선택 + R2 업로드). 절대 URL 입력 X.
//   - plan 은 서버가 내려준 값으로 섹션 gating.

type Plan = 'light' | 'basic' | 'plus' | 'pro';

// 플랜 순위 — 섹션의 minPlan 이 테넌트 plan 이하일 때만 노출.
const PLAN_ORDER: Record<Plan, number> = { light: 0, basic: 1, plus: 2, pro: 3 };
const PLAN_LABEL: Record<Plan, string> = { light: '라이트', basic: '베이직', plus: '플러스', pro: '프로' };

type FieldType = 'text' | 'textarea' | 'image';

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
}

interface SectionDef {
  id: string;
  label: string;
  minPlan: Plan;
  /** 반복 입력(여러 항목)이면 repeater fields, 아니면 단일 fields. */
  fields?: FieldDef[];
  repeater?: FieldDef[];
}

const SECTIONS: SectionDef[] = [
  {
    id: 'basics',
    label: '교회 기본정보',
    minPlan: 'light',
    fields: [
      { key: 'name', label: '교회이름', type: 'text' },
      { key: 'nameEn', label: '영문이름', type: 'text' },
      { key: 'phone', label: '대표전화', type: 'text' },
      { key: 'email', label: '이메일', type: 'text' },
      { key: 'address', label: '주소', type: 'text' },
      { key: 'logo', label: '로고', type: 'image' },
    ],
  },
  {
    id: 'hero',
    label: '메인 배너',
    minPlan: 'light',
    fields: [
      { key: 'title', label: '제목', type: 'text' },
      { key: 'subtitle', label: '부제', type: 'text' },
      { key: 'image', label: '대표사진', type: 'image' },
    ],
  },
  {
    id: 'greeting',
    label: '담임목사 인사말',
    minPlan: 'light',
    fields: [
      { key: 'pastorName', label: '목사님 성함', type: 'text' },
      { key: 'pastorRole', label: '직분', type: 'text' },
      { key: 'message', label: '인사말', type: 'textarea' },
      { key: 'photo', label: '사진', type: 'image' },
    ],
  },
  {
    id: 'about',
    label: '교회 소개',
    minPlan: 'light',
    fields: [
      { key: 'intro', label: '소개글', type: 'textarea' },
      { key: 'vision', label: '비전·표어', type: 'text' },
      { key: 'photo', label: '사진', type: 'image' },
    ],
  },
  {
    id: 'worship',
    label: '예배·모임 안내',
    minPlan: 'light',
    fields: [{ key: 'schedule', label: '예배·모임 시간 안내', type: 'textarea' }],
  },
  {
    id: 'location',
    label: '오시는 길',
    minPlan: 'light',
    fields: [
      { key: 'address', label: '주소', type: 'text' },
      { key: 'transport', label: '교통·주차 안내', type: 'textarea' },
      { key: 'mapImage', label: '약도/외관 사진', type: 'image' },
    ],
  },
  {
    id: 'staff',
    label: '교역자 소개',
    minPlan: 'light',
    repeater: [
      { key: 'name', label: '성함', type: 'text' },
      { key: 'role', label: '직분', type: 'text' },
      { key: 'bio', label: '약력', type: 'textarea' },
      { key: 'photo', label: '사진', type: 'image' },
    ],
  },
  {
    id: 'education',
    label: '교육부 소개',
    minPlan: 'light',
    fields: [
      { key: 'intro', label: '소개글', type: 'textarea' },
      { key: 'photo', label: '사진', type: 'image' },
    ],
  },
  {
    id: 'history',
    label: '교회 연혁',
    minPlan: 'basic',
    repeater: [
      { key: 'year', label: '연도', type: 'text' },
      { key: 'content', label: '내용', type: 'text' },
    ],
  },
  {
    id: 'koreanSchool',
    label: '한국학교',
    minPlan: 'plus',
    fields: [
      { key: 'intro', label: '소개글', type: 'textarea' },
      { key: 'photo', label: '사진', type: 'image' },
    ],
  },
  {
    id: 'newcomer',
    label: '새가족 안내',
    minPlan: 'plus',
    fields: [{ key: 'intro', label: '안내글', type: 'textarea' }],
  },
  {
    id: 'cells',
    label: '목장 안내',
    minPlan: 'plus',
    repeater: [
      { key: 'name', label: '목장명', type: 'text' },
      { key: 'leader', label: '목자', type: 'text' },
      { key: 'meeting', label: '모임 시간/장소', type: 'text' },
    ],
  },
];

// 한 섹션의 값. 단일 섹션은 Record<string,string>, repeater 섹션은 Record<string,string>[].
type SectionValue = Record<string, string> | Array<Record<string, string>>;
type IntakeData = Record<string, SectionValue>;

function isPlan(v: unknown): v is Plan {
  return v === 'light' || v === 'basic' || v === 'plus' || v === 'pro';
}

export default function IntakeWizard() {
  const apiClient = useDWChurchClient();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan>('light');
  const [status, setStatus] = useState<string>('draft');
  const [data, setData] = useState<IntakeData>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 제출 완료 화면을 보여줄지 — 'submitted'/'built' 진입 시 true, '수정하기' 누르면 false.
  const [showDoneScreen, setShowDoneScreen] = useState(false);

  // 이미지 업로드: 파일 → R2 → 짧은 URL. ImageUpload 가 client-side resize 수행.
  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      if (!apiClient) throw new Error('client not ready');
      const res = await apiClient.uploadFile(file, 'intake');
      return res.url;
    },
    [apiClient],
  );

  // 마운트 시 draft 로드 — plan/status/data 를 로컬 state 로.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!apiClient) return;
      try {
        const res = await apiClient.getIntake();
        if (cancelled) return;
        const loadedPlan: Plan = isPlan(res.plan) ? res.plan : 'light';
        setPlan(loadedPlan);
        setStatus(res.status || 'draft');
        setData((res.data as IntakeData) || {});
        if (res.status === 'submitted' || res.status === 'built') {
          setShowDoneScreen(true);
        }
      } catch {
        if (!cancelled) showToast('error', '입력 내용을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [apiClient, showToast]);

  // 노출 대상 섹션 — minPlan 이 현재 plan 이하인 것만.
  const visibleSections = useMemo(
    () => SECTIONS.filter((s) => PLAN_ORDER[s.minPlan] <= PLAN_ORDER[plan]),
    [plan],
  );

  // ── 로컬 state 갱신 헬퍼 (서버 write 없음) ────────────────────
  const setSingleField = (sectionId: string, key: string, value: string) => {
    setData((prev) => {
      const cur = (prev[sectionId] as Record<string, string>) || {};
      return { ...prev, [sectionId]: { ...cur, [key]: value } };
    });
    setDirty(true);
  };

  const getRepeaterRows = (sectionId: string): Array<Record<string, string>> => {
    const v = data[sectionId];
    return Array.isArray(v) ? v : [];
  };

  const addRepeaterRow = (sectionId: string) => {
    setData((prev) => {
      const rows = Array.isArray(prev[sectionId]) ? (prev[sectionId] as Array<Record<string, string>>) : [];
      return { ...prev, [sectionId]: [...rows, {}] };
    });
    setDirty(true);
  };

  const removeRepeaterRow = (sectionId: string, index: number) => {
    setData((prev) => {
      const rows = Array.isArray(prev[sectionId]) ? (prev[sectionId] as Array<Record<string, string>>) : [];
      return { ...prev, [sectionId]: rows.filter((_, i) => i !== index) };
    });
    setDirty(true);
  };

  const setRepeaterField = (sectionId: string, index: number, key: string, value: string) => {
    setData((prev) => {
      const rows = Array.isArray(prev[sectionId]) ? [...(prev[sectionId] as Array<Record<string, string>>)] : [];
      const row = { ...(rows[index] || {}), [key]: value };
      rows[index] = row;
      return { ...prev, [sectionId]: rows };
    });
    setDirty(true);
  };

  // ── 서버 write (명시적 저장) ──────────────────────────────────
  const handleSave = async () => {
    if (!apiClient) return;
    setSaving(true);
    try {
      await apiClient.saveIntake(data);
      setDirty(false);
      showToast('success', '저장되었습니다.');
    } catch {
      showToast('error', '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!apiClient) return;
    setSubmitting(true);
    try {
      await apiClient.saveIntake(data);
      const res = await apiClient.submitIntake();
      setDirty(false);
      setStatus(res.status || 'submitted');
      setShowDoneScreen(true);
      showToast('success', '입력이 제출되었습니다.');
    } catch {
      showToast('error', '제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 개별 필드 렌더 (config 기반 generic) ─────────────────────
  const renderField = (field: FieldDef, value: string, onChange: (v: string) => void) => {
    if (field.type === 'image') {
      // Logos/favicons/icons need their PNG transparency kept — preserve format.
      const transparent = /logo|favicon|icon/i.test(field.key);
      return (
        <ImageUpload
          value={value || ''}
          onChange={onChange}
          onUpload={uploadImage}
          label={field.label}
          format={transparent ? 'auto' : 'jpeg'}
        />
      );
    }
    if (field.type === 'textarea') {
      return (
        <FormField label={field.label}>
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            className={textareaClass}
          />
        </FormField>
      );
    }
    return (
      <FormField label={field.label}>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      </FormField>
    );
  };

  const renderSection = (section: SectionDef) => {
    if (section.repeater) {
      const rows = getRepeaterRows(section.id);
      const repeaterFields = section.repeater;
      return (
        <div className="space-y-4">
          {rows.length === 0 && (
            <p className="text-sm text-gray-400">아래 &lsquo;항목 추가&rsquo; 버튼으로 내용을 추가하세요.</p>
          )}
          {rows.map((row, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-4 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400">#{i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRepeaterRow(section.id, i)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>
              {repeaterFields.map((field) => (
                <div key={field.key}>
                  {renderField(field, row[field.key] || '', (v) =>
                    setRepeaterField(section.id, i, field.key, v),
                  )}
                </div>
              ))}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addRepeaterRow(section.id)}
            className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            + 항목 추가
          </button>
        </div>
      );
    }

    const single = (data[section.id] as Record<string, string>) || {};
    const fields = section.fields || [];
    return (
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            {renderField(field, single[field.key] || '', (v) =>
              setSingleField(section.id, field.key, v),
            )}
          </div>
        ))}
      </div>
    );
  };

  // ── 로딩 / 완료 화면 ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <CardSkeleton />
      </div>
    );
  }

  if (showDoneScreen) {
    const isBuilt = status === 'built';
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isBuilt ? '사이트가 제작되었습니다.' : '입력이 제출되었습니다.'}
          </h2>
          <p className="text-gray-500">
            {isBuilt
              ? '제출하신 내용으로 사이트가 만들어졌습니다. 추가 수정이 필요하면 내용을 다시 편집해 주세요.'
              : '곧 사이트를 만들어 드리겠습니다. 입력하신 내용은 언제든 수정 후 다시 제출할 수 있습니다.'}
          </p>
          <button
            type="button"
            onClick={() => setShowDoneScreen(false)}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            내용 수정하기
          </button>
        </div>
      </div>
    );
  }

  // ── 입력 화면 ────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto pb-28">
      {/* 인트로 */}
      <div className="mb-6 rounded-2xl bg-blue-50 border border-blue-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">초기 콘텐츠 입력</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          결제하신 <span className="font-semibold">{PLAN_LABEL[plan]}</span> 요금제에 맞춰 사이트에 들어갈
          내용을 입력해 주세요. 작성 중 언제든 &lsquo;저장&rsquo;을 누르면 이어서 작성할 수 있습니다.
        </p>
        <p className="mt-3 text-xs text-gray-500 leading-relaxed">
          설교·주보·게시판 등 정기적으로 올리는 콘텐츠는 사이트 오픈 후 관리자 페이지에서 직접 등록하시면 됩니다.
        </p>
      </div>

      {(status === 'submitted' || status === 'built') && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-5 py-3 text-sm text-amber-800">
          이미 제출된 내용입니다. 수정 후 다시 &lsquo;제출하기&rsquo;를 누르면 변경 사항이 반영됩니다.
        </div>
      )}

      {/* 섹션 카드들 */}
      <div className="space-y-6">
        {visibleSections.map((section) => (
          <section
            key={section.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">{section.label}</h3>
            {renderSection(section)}
          </section>
        ))}
      </div>

      {/* Sticky 액션 바 */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-200 px-4 lg:px-6 py-3 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400">
            {dirty ? '저장하지 않은 변경 사항이 있습니다.' : '모든 변경 사항이 저장되었습니다.'}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-600/25"
            >
              {submitting ? '제출 중...' : '제출하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
