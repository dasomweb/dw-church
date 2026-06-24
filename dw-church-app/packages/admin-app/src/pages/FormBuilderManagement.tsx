import { useState } from 'react';
import type { FormFieldType, FormFieldOption, CreateFormFieldInput } from '@dw-church/api-client';
import {
  useForms,
  useForm,
  useCreateForm,
  useUpdateForm,
  useDeleteForm,
  useCreateFormField,
  useUpdateFormField,
  useDeleteFormField,
  useReorderFormFields,
} from '@dw-church/api-client';
import {
  FormField,
  inputClass,
  selectClass,
  textareaClass,
  useToast,
  ConfirmDialog,
  EmptyState,
  CardSkeleton,
} from '../components';

// 폼 빌더 — 교역자가 직접 폼(목장보고서/새가족/문의 등)을 설계한다. 제출 내역은
// 기존 "폼 제출" 인박스(form_submissions)에 form_type=slug 로 쌓인다.

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: '단답형',
  textarea: '장문형',
  email: '이메일',
  phone: '전화번호',
  number: '숫자',
  date: '날짜',
  select: '드롭다운',
  radio: '객관식(단일)',
  checkbox: '체크박스(복수/동의)',
};
const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as FormFieldType[];
const CHOICE_TYPES: FormFieldType[] = ['select', 'radio', 'checkbox'];

type FieldDraft = {
  id?: string;
  fieldKey: string;
  fieldType: FormFieldType;
  label: string;
  placeholder: string;
  helpText: string;
  isRequired: boolean;
  options: FormFieldOption[];
};

const emptyFieldDraft = (): FieldDraft => ({
  fieldKey: '',
  fieldType: 'text',
  label: '',
  placeholder: '',
  helpText: '',
  isRequired: false,
  options: [],
});

export default function FormBuilderManagement() {
  const { showToast } = useToast();
  const { data: forms, isLoading } = useForms();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const createForm = useCreateForm();
  const deleteForm = useDeleteForm();

  // 새 폼 만들기 폼
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [confirmDeleteForm, setConfirmDeleteForm] = useState<string | null>(null);

  const handleCreateForm = async () => {
    if (!newName.trim() || !newSlug.trim()) {
      showToast('error', '폼 이름과 slug를 입력하세요');
      return;
    }
    try {
      const created = await createForm.mutateAsync({ name: newName.trim(), slug: newSlug.trim() });
      showToast('success', '폼을 만들었습니다');
      setNewName('');
      setNewSlug('');
      setSelectedId(created.id);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '폼 생성 실패');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
      {/* 좌측: 폼 목록 + 새 폼 */}
      <aside className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-2">새 폼 만들기</h3>
          <div className="space-y-2">
            <input className={inputClass} placeholder="폼 이름 (예: 목장보고서)" value={newName}
              onChange={(e) => setNewName(e.target.value)} />
            <input className={inputClass} placeholder="slug (영문소문자_숫자, 예: cell_report)" value={newSlug}
              onChange={(e) => setNewSlug(e.target.value.toLowerCase())} />
            <button onClick={handleCreateForm} disabled={createForm.isPending}
              className="w-full rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
              {createForm.isPending ? '생성 중…' : '+ 폼 추가'}
            </button>
            <p className="text-[11px] text-gray-400">slug는 제출 식별자입니다. 생성 후 변경할 수 없습니다.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">폼 목록 ({forms?.length ?? 0})</h3>
          </div>
          {isLoading ? (
            <div className="p-4"><CardSkeleton /></div>
          ) : !forms?.length ? (
            <EmptyState title="아직 만든 폼이 없습니다" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {forms.map((f) => (
                <li key={f.id}>
                  <button onClick={() => setSelectedId(f.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${selectedId === f.id ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{f.name}</span>
                      {!f.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">비활성</span>}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">{f.slug}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* 우측: 선택된 폼 편집기 */}
      <section>
        {selectedId ? (
          <FormEditor
            key={selectedId}
            formId={selectedId}
            onDelete={() => setConfirmDeleteForm(selectedId)}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
            왼쪽에서 폼을 선택하거나 새 폼을 만드세요.
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!confirmDeleteForm}
        title="폼 삭제"
        message="이 폼과 모든 항목을 삭제합니다. 이미 받은 제출 내역은 폼 제출함에 남습니다. 계속할까요?"
        onCancel={() => setConfirmDeleteForm(null)}
        onConfirm={async () => {
          if (!confirmDeleteForm) return;
          try {
            await deleteForm.mutateAsync(confirmDeleteForm);
            showToast('success', '폼을 삭제했습니다');
            if (selectedId === confirmDeleteForm) setSelectedId(null);
          } catch (e) {
            showToast('error', e instanceof Error ? e.message : '삭제 실패');
          } finally {
            setConfirmDeleteForm(null);
          }
        }}
      />
    </div>
  );
}

// ─── 폼 편집기 (메타 + 필드 빌더) ──────────────────────────────
function FormEditor({ formId, onDelete }: { formId: string; onDelete: () => void }) {
  const { showToast } = useToast();
  const { data, isLoading } = useForm(formId);
  const updateForm = useUpdateForm();
  const createField = useCreateFormField();
  const updateField = useUpdateFormField();
  const deleteField = useDeleteFormField();
  const reorderFields = useReorderFormFields();

  const [fieldDraft, setFieldDraft] = useState<FieldDraft | null>(null);
  const [confirmDeleteField, setConfirmDeleteField] = useState<string | null>(null);

  if (isLoading || !data) return <div className="bg-white rounded-xl border border-gray-200 p-6"><CardSkeleton /></div>;
  const { form, fields } = data;

  const saveMeta = async (patch: Parameters<typeof updateForm.mutateAsync>[0]['data']) => {
    try {
      await updateForm.mutateAsync({ id: formId, data: patch });
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '저장 실패');
    }
  };

  const submitField = async () => {
    if (!fieldDraft) return;
    if (!fieldDraft.fieldKey.trim() || !fieldDraft.label.trim()) {
      showToast('error', '항목 키와 라벨을 입력하세요');
      return;
    }
    const payload: CreateFormFieldInput = {
      fieldKey: fieldDraft.fieldKey.trim(),
      fieldType: fieldDraft.fieldType,
      label: fieldDraft.label.trim(),
      placeholder: fieldDraft.placeholder,
      helpText: fieldDraft.helpText,
      isRequired: fieldDraft.isRequired,
      options: CHOICE_TYPES.includes(fieldDraft.fieldType) ? fieldDraft.options : [],
    };
    try {
      if (fieldDraft.id) {
        await updateField.mutateAsync({ id: fieldDraft.id, data: payload });
      } else {
        await createField.mutateAsync({ formId, data: { ...payload, sortOrder: fields.length } });
      }
      setFieldDraft(null);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '항목 저장 실패');
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= fields.length) return;
    const ids = fields.map((f) => f.id);
    [ids[index], ids[next]] = [ids[next]!, ids[index]!];
    try {
      await reorderFields.mutateAsync({ formId, fieldIds: ids });
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '순서 변경 실패');
    }
  };

  return (
    <div className="space-y-5">
      {/* 폼 메타 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">{form.name} <span className="text-xs font-mono text-gray-400">/{form.slug}</span></h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input type="checkbox" checked={form.isActive} onChange={(e) => saveMeta({ isActive: e.target.checked })} />
              활성화
            </label>
            <button onClick={onDelete} className="text-xs text-gray-400 hover:text-red-600">폼 삭제</button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="폼 이름">
            <input className={inputClass} defaultValue={form.name}
              onBlur={(e) => e.target.value !== form.name && saveMeta({ name: e.target.value })} />
          </FormField>
          <FormField label="제출 버튼 문구">
            <input className={inputClass} defaultValue={form.submitLabel}
              onBlur={(e) => e.target.value !== form.submitLabel && saveMeta({ submitLabel: e.target.value })} />
          </FormField>
          <FormField label="설명">
            <textarea className={textareaClass} rows={2} defaultValue={form.description}
              onBlur={(e) => e.target.value !== form.description && saveMeta({ description: e.target.value })} />
          </FormField>
          <FormField label="제출 완료 메시지">
            <textarea className={textareaClass} rows={2} defaultValue={form.successMessage}
              onBlur={(e) => e.target.value !== form.successMessage && saveMeta({ successMessage: e.target.value })} />
          </FormField>
        </div>
        <p className="mt-3 text-[11px] text-gray-400">변경 후 다른 곳을 클릭하면 자동 저장됩니다.</p>
      </div>

      {/* 필드 빌더 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-900">입력 항목 ({fields.length})</h4>
          <button onClick={() => setFieldDraft(emptyFieldDraft())}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">+ 항목 추가</button>
        </div>

        {fields.length === 0 ? (
          <EmptyState title="아직 항목이 없습니다" description="‘항목 추가’로 입력란을 만드세요." />
        ) : (
          <ul className="space-y-2">
            {fields.map((f, i) => (
              <li key={f.id} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 leading-none">▲</button>
                  <button onClick={() => move(i, 1)} disabled={i === fields.length - 1}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 leading-none">▼</button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {f.label}
                    {f.isRequired && <span className="text-red-500 ml-1">*</span>}
                    <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{FIELD_TYPE_LABELS[f.fieldType]}</span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">{f.fieldKey}{f.options.length > 0 && ` · ${f.options.length}개 선택지`}</div>
                </div>
                <button onClick={() => setFieldDraft({
                  id: f.id, fieldKey: f.fieldKey, fieldType: f.fieldType, label: f.label,
                  placeholder: f.placeholder, helpText: f.helpText, isRequired: f.isRequired, options: f.options,
                })} className="text-xs text-blue-600 hover:underline">수정</button>
                <button onClick={() => setConfirmDeleteField(f.id)} className="text-xs text-gray-400 hover:text-red-600">삭제</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 항목 추가/수정 패널 */}
      {fieldDraft && (
        <FieldDraftPanel
          draft={fieldDraft}
          onChange={setFieldDraft}
          onCancel={() => setFieldDraft(null)}
          onSave={submitField}
          saving={createField.isPending || updateField.isPending}
        />
      )}

      <ConfirmDialog
        open={!!confirmDeleteField}
        title="항목 삭제"
        message="이 입력 항목을 삭제할까요?"
        onCancel={() => setConfirmDeleteField(null)}
        onConfirm={async () => {
          if (!confirmDeleteField) return;
          try {
            await deleteField.mutateAsync(confirmDeleteField);
          } catch (e) {
            showToast('error', e instanceof Error ? e.message : '삭제 실패');
          } finally {
            setConfirmDeleteField(null);
          }
        }}
      />
    </div>
  );
}

// ─── 항목 편집 패널 ────────────────────────────────────────────
function FieldDraftPanel({
  draft, onChange, onCancel, onSave, saving,
}: {
  draft: FieldDraft;
  onChange: (d: FieldDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const isChoice = CHOICE_TYPES.includes(draft.fieldType);
  const set = (patch: Partial<FieldDraft>) => onChange({ ...draft, ...patch });

  return (
    <div className="bg-white rounded-xl border-2 border-blue-200 p-5">
      <h4 className="text-sm font-bold text-gray-900 mb-3">{draft.id ? '항목 수정' : '새 항목'}</h4>
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="라벨 (화면 표시)">
          <input className={inputClass} value={draft.label} onChange={(e) => set({ label: e.target.value })}
            placeholder="예: 목장 이름" />
        </FormField>
        <FormField label="항목 키 (field key)">
          <input className={inputClass} value={draft.fieldKey}
            onChange={(e) => set({ fieldKey: e.target.value.toLowerCase() })} placeholder="예: cell_name" />
        </FormField>
        <FormField label="유형">
          <select className={selectClass} value={draft.fieldType}
            onChange={(e) => set({ fieldType: e.target.value as FormFieldType })}>
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
          </select>
        </FormField>
        <FormField label="안내 문구 (placeholder)">
          <input className={inputClass} value={draft.placeholder} onChange={(e) => set({ placeholder: e.target.value })} />
        </FormField>
        <FormField label="도움말">
          <input className={inputClass} value={draft.helpText} onChange={(e) => set({ helpText: e.target.value })} />
        </FormField>
        <FormField label="필수 입력">
          <label className="flex items-center gap-2 text-sm text-gray-700 pt-2">
            <input type="checkbox" checked={draft.isRequired} onChange={(e) => set({ isRequired: e.target.checked })} />
            필수 항목으로 표시
          </label>
        </FormField>
      </div>

      {isChoice && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">선택지</span>
            <button onClick={() => set({ options: [...draft.options, { value: '', label: '' }] })}
              className="text-xs text-blue-600 hover:underline">+ 선택지 추가</button>
          </div>
          {draft.options.length === 0 && <p className="text-xs text-gray-400">선택지를 추가하세요. (체크박스에 선택지가 없으면 단일 동의 체크박스가 됩니다.)</p>}
          <div className="space-y-2">
            {draft.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input className={inputClass} placeholder="값(value)" value={opt.value}
                  onChange={(e) => {
                    const options = [...draft.options];
                    options[idx] = { ...options[idx]!, value: e.target.value };
                    set({ options });
                  }} />
                <input className={inputClass} placeholder="표시 라벨" value={opt.label}
                  onChange={(e) => {
                    const options = [...draft.options];
                    options[idx] = { ...options[idx]!, label: e.target.value };
                    set({ options });
                  }} />
                <button onClick={() => set({ options: draft.options.filter((_, j) => j !== idx) })}
                  className="text-gray-400 hover:text-red-600 px-1">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={onSave} disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
          {saving ? '저장 중…' : '항목 저장'}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">취소</button>
      </div>
    </div>
  );
}
