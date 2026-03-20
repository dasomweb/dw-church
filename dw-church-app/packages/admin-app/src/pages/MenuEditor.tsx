import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { MenuItem } from '@dw-church/api-client';
import {
  useMenus,
  useCreateMenu,
  useUpdateMenu,
  useDeleteMenu,
  useReorderMenus,
  usePages,
} from '@dw-church/api-client';

interface MenuFormData {
  label: string;
  pageId: string;
  externalUrl: string;
  parentId: string;
  isVisible: boolean;
}

function buildTree(items: MenuItem[]): MenuItem[] {
  const map = new Map<string, MenuItem & { children: MenuItem[] }>();
  const roots: (MenuItem & { children: MenuItem[] })[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots.sort((a, b) => a.sortOrder - b.sortOrder);
}

export default function MenuEditor() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: menuItems, isLoading } = useMenus();
  const { data: pages } = usePages();
  const createMenu = useCreateMenu();
  const updateMenu = useUpdateMenu();
  const deleteMenu = useDeleteMenu();
  const reorderMenus = useReorderMenus();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<MenuFormData>();

  const watchPageId = watch('pageId');

  const tree = menuItems ? buildTree(menuItems) : [];
  const flatItems = menuItems?.sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

  const handleCreate = () => {
    reset({ label: '', pageId: '', externalUrl: '', parentId: '', isVisible: true });
    setShowCreateForm(true);
    setEditingId(null);
  };

  const handleEdit = (item: MenuItem) => {
    reset({
      label: item.label,
      pageId: item.pageId || '',
      externalUrl: item.externalUrl || '',
      parentId: item.parentId || '',
      isVisible: item.isVisible,
    });
    setEditingId(item.id);
    setShowCreateForm(false);
  };

  const handleDelete = (item: MenuItem) => {
    if (window.confirm(`"${item.label}" 메뉴를 삭제하시겠습니까?`)) {
      deleteMenu.mutate(item.id);
      if (editingId === item.id) setEditingId(null);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const sorted = [...flatItems];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[index]!, b = sorted[swapIdx]!;
    sorted[index] = b; sorted[swapIdx] = a;
    reorderMenus.mutate(sorted.map((m) => m.id));
  };

  const handleToggleVisibility = (item: MenuItem) => {
    updateMenu.mutate({ id: item.id, data: { isVisible: !item.isVisible } });
  };

  const onSubmitCreate = (data: MenuFormData) => {
    createMenu.mutate(
      {
        label: data.label,
        pageId: data.pageId || undefined,
        externalUrl: data.externalUrl || undefined,
        parentId: data.parentId || undefined,
        sortOrder: flatItems.length,
        isVisible: data.isVisible,
      },
      { onSuccess: () => setShowCreateForm(false) },
    );
  };

  const onSubmitEdit = (data: MenuFormData) => {
    if (!editingId) return;
    updateMenu.mutate(
      {
        id: editingId,
        data: {
          label: data.label,
          pageId: data.pageId || undefined,
          externalUrl: data.externalUrl || undefined,
          parentId: data.parentId || undefined,
          isVisible: data.isVisible,
        },
      },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const MenuItemRow = ({
    item,
    index,
    depth = 0,
  }: {
    item: MenuItem & { children?: MenuItem[] };
    index: number;
    depth?: number;
  }) => (
    <>
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b hover:bg-gray-50 ${
          !item.isVisible ? 'opacity-50' : ''
        } ${editingId === item.id ? 'bg-blue-50' : ''}`}
        style={{ paddingLeft: `${1 + depth * 1.5}rem` }}
      >
        {depth > 0 && <span className="text-gray-300 text-sm">└</span>}
        <span className="flex-1 text-sm font-medium">{item.label}</span>
        <span className="text-xs text-gray-400">
          {item.pageId
            ? pages?.find((p) => p.id === item.pageId)?.title || `page:${item.pageId}`
            : item.externalUrl || '(링크 없음)'}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => handleMove(index, 'up')}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 15l7-7 7 7" /></svg>
          </button>
          <button
            onClick={() => handleMove(index, 'down')}
            disabled={index === flatItems.length - 1}
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
          </button>
          <button
            onClick={() => handleToggleVisibility(item)}
            className="p-1 text-gray-400 hover:text-gray-700"
            title={item.isVisible ? '숨기기' : '표시'}
          >
            {item.isVisible ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" /></svg>
            )}
          </button>
          <button
            onClick={() => handleEdit(item)}
            className="p-1 text-gray-400 hover:text-blue-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button
            onClick={() => handleDelete(item)}
            className="p-1 text-gray-400 hover:text-red-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      {item.children?.sort((a, b) => a.sortOrder - b.sortOrder).map((child, childIdx) => (
        <MenuItemRow key={child.id} item={child as MenuItem & { children?: MenuItem[] }} index={childIdx} depth={depth + 1} />
      ))}
    </>
  );

  const MenuForm = ({
    onSubmitForm,
    isCreating,
  }: {
    onSubmitForm: (data: MenuFormData) => void;
    isCreating: boolean;
  }) => (
    <form onSubmit={handleSubmit(onSubmitForm)} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-bold">
        {isCreating ? '새 메뉴 항목' : '메뉴 수정'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">라벨</label>
          <input
            {...register('label', { required: '라벨을 입력하세요' })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">상위 메뉴</label>
          <select {...register('parentId')} className="w-full border rounded px-3 py-2 text-sm">
            <option value="">(최상위)</option>
            {flatItems
              .filter((m) => m.id !== editingId)
              .map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">페이지 연결</label>
          <select {...register('pageId')} className="w-full border rounded px-3 py-2 text-sm">
            <option value="">(선택 안함)</option>
            {pages?.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">외부 URL</label>
          <input
            {...register('externalUrl')}
            placeholder="https://..."
            disabled={!!watchPageId}
            className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100"
          />
        </div>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isVisible')} className="rounded" />
          표시
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createMenu.isPending || updateMenu.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          저장
        </button>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm(false);
            setEditingId(null);
          }}
          className="px-4 py-2 bg-gray-200 text-sm rounded hover:bg-gray-300"
        >
          취소
        </button>
      </div>
    </form>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">메뉴 관리</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          새 메뉴 항목
        </button>
      </div>

      {showCreateForm && <MenuForm onSubmitForm={onSubmitCreate} isCreating />}
      {editingId && <MenuForm onSubmitForm={onSubmitEdit} isCreating={false} />}

      {isLoading && <p className="text-sm text-gray-500">로딩 중...</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {tree.length === 0 && !isLoading && (
          <p className="p-4 text-sm text-gray-400 text-center">메뉴 항목이 없습니다</p>
        )}
        {tree.map((item, index) => (
          <MenuItemRow key={item.id} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}
