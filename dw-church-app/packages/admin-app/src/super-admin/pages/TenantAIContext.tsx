/**
 * Tenant AI Context — business profile + marketing voice that the AI
 * Designer (Phase 3-AI follow-up) and AI page generator (existing
 * page-wizard) read when generating sections and recommending themes.
 *
 * Backed by a new `tenants.ai_context` JSONB column (runtime ALTER
 * TABLE pattern same as theme/custom_domains). The server-side
 * GET/PUT /admin/tenants/:id/ai-context endpoints are deferred to a
 * follow-up; the UI persists locally for now so super-admins can
 * draft the content. The inline notice makes the deferral explicit.
 */
import { useState } from 'react';
import { useToast } from '../../components';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';

interface AIContextDraft {
  businessProfile: string;
  targetAudience: string;
  brandVoice: string;
  marketingGoals: string;
  notes: string;
}

const EMPTY: AIContextDraft = {
  businessProfile: '',
  targetAudience: '',
  brandVoice: '',
  marketingGoals: '',
  notes: '',
};

export default function TenantAIContext() {
  const { tenant } = useSuperAdminTenant();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<AIContextDraft>(EMPTY);

  const save = () => {
    // Persistence wires up in Phase 7b-server. Local state stands in
    // for the round trip so the UI is realistic.
    showToast('success', '저장됨 (서버 영속화는 Phase 7b-server)');
  };

  const FIELDS: { key: keyof AIContextDraft; label: string; placeholder: string; rows: number }[] = [
    {
      key: 'businessProfile',
      label: '비즈니스 프로필',
      placeholder: '예: 미 동부 뉴저지 버겐카운티에 위치한 700명 규모 한인 이민교회. 영어권 2세 사역과 새가족·목장 사역 운영.',
      rows: 4,
    },
    {
      key: 'targetAudience',
      label: '주요 대상',
      placeholder: '예: 30-50대 가정. 인근 직장인. 새가족 / 미신앙자.',
      rows: 3,
    },
    {
      key: 'brandVoice',
      label: '브랜드 보이스',
      placeholder: '예: 따뜻하고 친근하지만 전통적 권위를 유지. 격식 있는 한국어. 영어 혼용 최소화.',
      rows: 3,
    },
    {
      key: 'marketingGoals',
      label: '마케팅 / 사역 목표',
      placeholder: '예: 새가족 등록 월 20명. 어린이부 신규 등록률 향상. 청년부 정착률.',
      rows: 3,
    },
    {
      key: 'notes',
      label: '추가 노트',
      placeholder: 'AI 가 페이지나 디자인을 생성할 때 참고할 기타 사항.',
      rows: 4,
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">AI 컨텍스트</h1>
      <p className="text-sm text-gray-500 mb-6">
        AI 페이지 생성기와 디자인 추천에 공급되는 테넌트({tenant?.name ?? '...'}) 컨텍스트. 한 번 채워두면 모든 AI 호출이 자동 참고합니다.
      </p>

      <div className="space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
            <textarea
              value={draft[f.key]}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              rows={f.rows}
              placeholder={f.placeholder}
              className="w-full px-3 py-2 text-sm border rounded-lg"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={() => setDraft(EMPTY)}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
        >
          비우기
        </button>
        <button
          onClick={save}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          저장
        </button>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
        ⚠ 서버 영속화 (tenants.ai_context JSONB + GET/PUT) 는 Phase 7b-server 에서 추가됩니다. 현재는 UI 만 동작.
      </div>
    </div>
  );
}
