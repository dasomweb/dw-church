import { useState } from 'react';
import type { Schedule, PostStatus } from '@dw-church/api-client';
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from '@dw-church/api-client';
import { FormField, FormSection, FormRow, inputClass, selectClass, useToast, ConfirmDialog, EmptyState, CardSkeleton } from '../components';

const DEFAULT_COLUMNS = ['예배', '시간', '장소'];

// Editable form state for a single schedule GROUP. Mirrors the ScheduleGroup
// shape ({ title, columns, rows }) the storefront ScheduleBoardBlock renders.
interface ScheduleFormState {
  title: string;
  columns: string[];
  rows: string[][];
  sortOrder: number;
  status: PostStatus;
}

const emptyForm = (): ScheduleFormState => ({
  title: '',
  columns: [...DEFAULT_COLUMNS],
  rows: [],
  sortOrder: 0,
  status: 'published',
});

export default function ScheduleManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Schedule | null>(null);
  const [form, setForm] = useState<ScheduleFormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { showToast } = useToast();
  const { data, isLoading, error } = useSchedules();
  const createMutation = useCreateSchedule();
  const updateMutation = useUpdateSchedule();
  const deleteMutation = useDeleteSchedule();

  const handleEdit = (item: Schedule) => {
    setEditingItem(item);
    setForm({
      title: item.title || '',
      columns: item.columns && item.columns.length ? [...item.columns] : [...DEFAULT_COLUMNS],
      rows: Array.isArray(item.rows) ? item.rows.map((r) => [...r]) : [],
      sortOrder: item.sortOrder ?? 0,
      status: item.status,
    });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    setForm(emptyForm());
    setView('edit');
  };

  const handleDelete = (item: Schedule) => {
    setDeleteTarget({ id: item.id, name: item.title || '' });
  };

  // ─── Row repeater helpers (ported from ScheduleGroupsField, single-group) ──
  const colCount = form.columns.length || DEFAULT_COLUMNS.length;
  const setColumn = (ci: number, val: string) => {
    setForm((f) => { const columns = [...f.columns]; columns[ci] = val; return { ...f, columns }; });
  };
  const setCell = (ri: number, ci: number, val: string) => {
    setForm((f) => {
      const rows = f.rows.map((r) => [...r]);
      while (rows[ri]!.length < colCount) rows[ri]!.push('');
      rows[ri]![ci] = val;
      return { ...f, rows };
    });
  };
  const addRow = () => setForm((f) => ({ ...f, rows: [...f.rows, Array.from({ length: colCount }, () => '')] }));
  const removeRow = (ri: number) => setForm((f) => ({ ...f, rows: f.rows.filter((_, i) => i !== ri) }));

  const onSubmit = () => {
    if (!form.title.trim()) { showToast('error', '그룹 이름을 입력하세요.'); return; }
    const payload = {
      title: form.title.trim(),
      columns: form.columns,
      rows: form.rows,
      sortOrder: Number(form.sortOrder) || 0,
      status: form.status,
    } as unknown as Omit<Schedule, 'id' | 'createdAt'>;
    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, data: payload },
        {
          onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); },
          onError: () => { showToast('error', '오류가 발생했습니다.'); },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); },
        onError: () => { showToast('error', '오류가 발생했습니다.'); },
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (view === 'edit') {
    const gridCols = `repeat(${colCount}, 1fr) auto`;
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button type="button" onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            목록으로
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{editingItem ? '예배/모임 수정' : '예배/모임 등록'}</h2>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
          <FormSection title="그룹 정보" description="하나의 그룹은 제목이 붙은 표 하나입니다 (예: 주일 예배)">
            <FormRow>
              <FormField label="그룹 이름" required>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="예: 주일 예배"
                  className={inputClass}
                />
              </FormField>
              <FormField label="상태">
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PostStatus }))}
                  className={selectClass}
                >
                  <option value="published">공개</option>
                  <option value="draft">임시저장</option>
                  <option value="archived">보관</option>
                </select>
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="정렬 순서">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className={inputClass}
                />
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="표 내용" description="컬럼 헤더 3개와 각 행을 입력합니다 (예: 예배/시간/장소 또는 모임/부서/장소)">
            <div className="space-y-2">
              <div className="grid gap-1.5" style={{ gridTemplateColumns: gridCols }}>
                {/* Column header row */}
                {form.columns.map((col, ci) => (
                  <input
                    key={`h${ci}`}
                    value={col}
                    onChange={(e) => setColumn(ci, e.target.value)}
                    placeholder={DEFAULT_COLUMNS[ci] || '헤더'}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-gray-50 font-medium focus:border-blue-500 outline-none"
                  />
                ))}
                <span />
                {/* Data rows */}
                {form.rows.map((row, ri) => (
                  <div key={ri} className="contents">
                    {form.columns.map((_, ci) => (
                      <input
                        key={ci}
                        value={row[ci] || ''}
                        onChange={(e) => setCell(ri, ci, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none"
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => removeRow(ri)}
                      className="text-red-400 hover:text-red-600 text-sm px-2"
                      aria-label={`${ri + 1}번째 행 삭제`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addRow} className="text-sm text-blue-600 hover:text-blue-800">+ 행 추가</button>
            </div>
          </FormSection>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">그룹 이름은 필수입니다</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setView('list')} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                취소
              </button>
              <button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 text-sm font-medium transition-all disabled:opacity-50 shadow-sm shadow-blue-600/25">
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-red-500 text-sm">저장 중 오류가 발생했습니다.</p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">예배 및 모임 관리</h2>
        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          새 그룹
        </button>
      </div>

      {isLoading && <CardSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {data && data.length === 0 && !isLoading && (
        <EmptyState
          icon="🗓️"
          title="등록된 예배/모임이 없습니다"
          description="새로운 그룹을 추가해보세요."
          actionLabel="그룹 추가"
          onAction={() => handleCreate()}
        />
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.id} className="border rounded-lg px-4 py-3 flex items-center justify-between hover:shadow-sm transition-shadow">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {(item.rows?.length ?? 0)}개 항목
                  {item.status !== 'published' && (
                    <span className="ml-2 text-amber-500">
                      {item.status === 'draft' ? '임시저장' : '보관'}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => handleEdit(item)} className="text-xs text-blue-600 hover:underline">편집</button>
                <button
                  onClick={() => handleDelete(item)}
                  disabled={deleteMutation.isPending}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget!.id, {
            onSuccess: () => { showToast('success', '삭제되었습니다.'); },
            onError: () => { showToast('error', '오류가 발생했습니다.'); },
          });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
