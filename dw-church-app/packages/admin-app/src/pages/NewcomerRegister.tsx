import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NewcomerSubmission } from '@dw-church/api-client';
import { useCreateNewcomer } from '@dw-church/api-client';
import { FormField, inputClass, selectClass, textareaClass, useToast } from '../components';
import { useTenantScope } from '../lib/tenant-scope';

// 새가족 등록서 — 새가족 담당자가 서면으로 받은 등록 카드를 직접 기입하는 전용 페이지.
// 인박스/목록(NewcomerManagement)과 달리 "작성"에 최적화(넓은 폼 + 연속 등록).
// 저장은 POST /newcomers 재사용(useCreateNewcomer). 이후 정착 히스토리는 상세에서 관리.

const EMPTY: NewcomerSubmission = {
  name: '', phone: '', email: '', address: '', birthDate: '', gender: '',
  prevChurch: '', visitPath: '', faithStatus: '', familyInfo: '', prayerRequest: '',
};

// 섹션 제목
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-4 border-l-4 border-blue-600 pl-3 text-[15px] font-bold text-gray-800">{children}</h3>;
}

export default function NewcomerRegister() {
  const navigate = useNavigate();
  const { basePath } = useTenantScope();
  const { showToast } = useToast();
  const createMutation = useCreateNewcomer();
  const [form, setForm] = useState<NewcomerSubmission>(EMPTY);

  const setF = (patch: Partial<NewcomerSubmission>) => setForm((prev) => ({ ...prev, ...patch }));
  const goList = () => navigate(`${basePath}/newcomers`);

  // continueAfter=true: 저장 후 폼을 비우고 계속 입력(종이 여러 장 연속 등록).
  const save = (continueAfter: boolean) => {
    if (!form.name?.trim()) { showToast('error', '이름은 필수입니다.'); return; }
    createMutation.mutate(form, {
      onSuccess: (created) => {
        showToast('success', `${form.name} 님을 등록했습니다.`);
        if (continueAfter) {
          setForm(EMPTY);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          navigate(`${basePath}/newcomers`);
          void created;
        }
      },
      onError: () => { showToast('error', '등록 중 오류가 발생했습니다.'); },
    });
  };

  return (
    <div className="p-4 sm:p-6">
      {/* 헤더 */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={goList} className="mb-1 text-sm text-gray-400 hover:text-gray-600">← 새가족 목록</button>
          <h2 className="text-xl font-bold">새가족 등록서</h2>
          <p className="mt-1 text-sm text-gray-500">서면으로 받은 등록 카드를 그대로 입력하세요. 이름만 필수이며, 나머지는 아는 만큼만 적으셔도 됩니다.</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-8 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
        {/* 1. 인적사항 */}
        <section>
          <SectionTitle>인적사항</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="이름 *">
              <input className={inputClass} value={form.name} onChange={(e) => setF({ name: e.target.value })} placeholder="예: 김성실" autoFocus />
            </FormField>
            <FormField label="성별">
              <select className={selectClass} value={form.gender ?? ''} onChange={(e) => setF({ gender: e.target.value })}>
                <option value="">선택 안 함</option>
                <option value="남">남</option>
                <option value="여">여</option>
              </select>
            </FormField>
            <FormField label="생년월일 / 연령대">
              <input className={inputClass} value={form.birthDate ?? ''} onChange={(e) => setF({ birthDate: e.target.value })} placeholder="1990-03-15 또는 30대" />
            </FormField>
            <FormField label="연락처">
              <input className={inputClass} value={form.phone ?? ''} onChange={(e) => setF({ phone: e.target.value })} placeholder="(201) 555-0100" />
            </FormField>
            <FormField label="이메일">
              <input className={inputClass} value={form.email ?? ''} onChange={(e) => setF({ email: e.target.value })} placeholder="name@example.com" />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="주소">
                <input className={inputClass} value={form.address ?? ''} onChange={(e) => setF({ address: e.target.value })} placeholder="주소" />
              </FormField>
            </div>
          </div>
        </section>

        {/* 2. 신앙 배경 */}
        <section>
          <SectionTitle>신앙 배경</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="신앙 상태">
              <input className={inputClass} value={form.faithStatus ?? ''} onChange={(e) => setF({ faithStatus: e.target.value })} placeholder="초신자 / 기신자 / 수평이동 / 세례교인" />
            </FormField>
            <FormField label="이전 교회">
              <input className={inputClass} value={form.prevChurch ?? ''} onChange={(e) => setF({ prevChurch: e.target.value })} placeholder="이전 출석 교회 (있는 경우)" />
            </FormField>
          </div>
        </section>

        {/* 3. 방문 경위 */}
        <section>
          <SectionTitle>방문 경위</SectionTitle>
          <FormField label="어떻게 오시게 되었나요 / 소개자">
            <input className={inputClass} value={form.visitPath ?? ''} onChange={(e) => setF({ visitPath: e.target.value })} placeholder="지인 소개(성함) / 검색 / 이사 / 전단 등" />
          </FormField>
        </section>

        {/* 4. 가족사항 */}
        <section>
          <SectionTitle>가족사항</SectionTitle>
          <FormField label="동반 가족 / 가족 관계">
            <textarea className={textareaClass} rows={2} value={form.familyInfo ?? ''} onChange={(e) => setF({ familyInfo: e.target.value })} placeholder="배우자, 자녀(이름·나이), 함께 출석하는 가족 등" />
          </FormField>
        </section>

        {/* 5. 기도제목 · 특이사항 */}
        <section>
          <SectionTitle>기도제목 · 특이사항</SectionTitle>
          <FormField label="기도제목">
            <textarea className={textareaClass} rows={3} value={form.prayerRequest ?? ''} onChange={(e) => setF({ prayerRequest: e.target.value })} placeholder="기도제목, 상담이 필요한 부분, 관심 사역 등" />
          </FormField>
        </section>

        {/* 저장 버튼 */}
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
          <button
            onClick={goList}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={() => save(true)}
            disabled={createMutation.isPending}
            className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-100 disabled:opacity-50"
          >
            {createMutation.isPending ? '저장 중...' : '저장 후 계속 등록'}
          </button>
          <button
            onClick={() => save(false)}
            disabled={createMutation.isPending}
            className="rounded-xl bg-blue-600 px-7 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? '저장 중...' : '저장하고 목록으로'}
          </button>
        </div>
      </div>
    </div>
  );
}
