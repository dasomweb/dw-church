import { useState, useRef, useCallback } from 'react';
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
import { useToast } from '../components';

interface MenuFormData {
  label: string;
  pageId: string;
  externalUrl: string;
  isVisible: boolean;
}

interface FlatNode {
  id: string;
  label: string;
  parentId: string | null;
  pageId: string | null;
  externalUrl: string | null;
  isVisible: boolean;
  depth: number;
}

function buildFlatList(items: MenuItem[]): FlatNode[] {
  const map = new Map<string, MenuItem & { children: MenuItem[] }>();
  const roots: (MenuItem & { children: MenuItem[] })[] = [];

  for (const item of items) map.set(item.id, { ...item, children: [] });
  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: (MenuItem & { children: MenuItem[] })[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const n of nodes) sortNodes(n.children);
  };
  sortNodes(roots);

  const flat: FlatNode[] = [];
  const walk = (nodes: (MenuItem & { children: MenuItem[] })[], depth: number) => {
    for (const node of nodes) {
      flat.push({
        id: node.id,
        label: node.label,
        parentId: node.parentId || null,
        pageId: node.pageId || null,
        externalUrl: node.externalUrl || null,
        isVisible: node.isVisible,
        depth,
      });
      walk(node.children, depth + 1);
    }
  };
  walk(roots, 0);
  return flat;
}

function recalcParents(flatList: FlatNode[]): { id: string; parentId: string | null; sortOrder: number }[] {
  const result: { id: string; parentId: string | null; sortOrder: number }[] = [];
  const stack: { id: string; depth: number }[] = [];

  for (let i = 0; i < flatList.length; i++) {
    const node = flatList[i]!;
    while (stack.length > 0 && stack[stack.length - 1]!.depth >= node.depth) {
      stack.pop();
    }
    const parentId = stack.length > 0 ? stack[stack.length - 1]!.id : null;

    // Calculate sortOrder among siblings
    let sortOrder = 0;
    for (let j = 0; j < i; j++) {
      const prev = flatList[j]!;
      const prevParent = result[j]!.parentId;
      if (prevParent === parentId) sortOrder++;
    }

    result.push({ id: node.id, parentId, sortOrder });
    stack.push({ id: node.id, depth: node.depth });
  }
  return result;
}

export default function MenuEditor() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const { showToast } = useToast();
  const { data: menuItems, isLoading } = useMenus();
  const { data: pages } = usePages();
  const createMenu = useCreateMenu();
  const updateMenu = useUpdateMenu();
  const deleteMenu = useDeleteMenu();
  const reorderMenus = useReorderMenus();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<MenuFormData>();
  const watchPageId = watch('pageId');

  const flatList = menuItems ? buildFlatList(menuItems) : [];

  const handleEdit = (node: FlatNode) => {
    reset({
      label: node.label,
      pageId: node.pageId || '',
      externalUrl: node.externalUrl || '',
      isVisible: node.isVisible,
    });
    setEditingId(node.id);
    setShowCreateForm(false);
  };

  const handleCreate = () => {
    reset({ label: '', pageId: '', externalUrl: '', isVisible: true });
    setShowCreateForm(true);
    setEditingId(null);
  };

  const handleDelete = (node: FlatNode) => {
    if (window.confirm(`"${node.label}" 메뉴를 삭제하시겠습니까?`)) {
      deleteMenu.mutate(node.id, { onSuccess: () => showToast('success', '삭제되었습니다.') });
      if (editingId === node.id) setEditingId(null);
    }
  };

  const handleToggleVisibility = (node: FlatNode) => {
    updateMenu.mutate({ id: node.id, data: { isVisible: !node.isVisible } });
  };

  // Indent: increase depth by 1 (max 2)
  const handleIndent = (index: number) => {
    if (index === 0) return;
    const newList = flatList.map((n) => ({ ...n }));
    const node = newList[index]!;
    if (node.depth >= 2) return;
    node.depth++;
    // Also indent children
    for (let i = index + 1; i < newList.length; i++) {
      if (newList[i]!.depth <= flatList[index]!.depth) break;
      newList[i]!.depth++;
    }
    saveOrder(newList);
  };

  // Outdent: decrease depth by 1 (min 0)
  const handleOutdent = (index: number) => {
    const newList = flatList.map((n) => ({ ...n }));
    const node = newList[index]!;
    if (node.depth === 0) return;
    node.depth--;
    // Also outdent children
    for (let i = index + 1; i < newList.length; i++) {
      if (newList[i]!.depth <= flatList[index]!.depth) break;
      newList[i]!.depth--;
    }
    saveOrder(newList);
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIdx(index);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); setDropIdx(null); return; }

    const newList = flatList.map((n) => ({ ...n }));
    const [moved] = newList.splice(dragIdx, 1);
    newList.splice(targetIdx > dragIdx ? targetIdx - 1 : targetIdx, 0, moved!);

    setDragIdx(null);
    setDropIdx(null);
    saveOrder(newList);
  };

  const saveOrder = (newList: FlatNode[]) => {
    const reordered = recalcParents(newList);
    reorderMenus.mutate(reordered.map((r) => r.id), {
      onSuccess: () => showToast('success', '순서가 변경되었습니다.'),
    });
  };

  const onSubmitCreate = (data: MenuFormData) => {
    createMenu.mutate({
      label: data.label,
      pageId: data.pageId || undefined,
      externalUrl: data.externalUrl || undefined,
      sortOrder: flatList.length,
      isVisible: data.isVisible,
    }, {
      onSuccess: () => { setShowCreateForm(false); showToast('success', '메뉴가 추가되었습니다.'); },
    });
  };

  const onSubmitEdit = (data: MenuFormData) => {
    if (!editingId) return;
    updateMenu.mutate({
      id: editingId,
      data: {
        label: data.label,
        pageId: data.pageId || undefined,
        externalUrl: data.externalUrl || undefined,
        isVisible: data.isVisible,
      },
    }, {
      onSuccess: () => { setEditingId(null); showToast('success', '저장되었습니다.'); },
    });
  };

  const MenuForm = ({ onSubmitForm, isCreating }: { onSubmitForm: (data: MenuFormData) => void; isCreating: boolean }) => (
    <form onSubmit={handleSubmit(onSubmitForm)} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-bold">{isCreating ? '새 메뉴 항목' : '메뉴 수정'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">라벨</label>
          <input {...register('label', { required: '라벨을 입력하세요' })} className="w-full border rounded px-3 py-2 text-sm" />
          {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">페이지 연결</label>
          <select {...register('pageId')} className="w-full border rounded px-3 py-2 text-sm">
            <option value="">(선택 안함)</option>
            {pages?.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">외부 URL</label>
        <input {...register('externalUrl')} placeholder="https://..." disabled={!!watchPageId} className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100" />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isVisible')} className="rounded" />
          표시
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={createMenu.isPending || updateMenu.isPending} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">저장</button>
        <button type="button" onClick={() => { setShowCreateForm(false); setEditingId(null); }} className="px-4 py-2 bg-gray-200 text-sm rounded hover:bg-gray-300">취소</button>
      </div>
    </form>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">메뉴 관리</h2>
        <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">새 메뉴 항목</button>
      </div>

      <p className="text-xs text-gray-500">드래그로 순서 변경 · → ← 로 하위/상위 레벨 이동 · 최대 3단계</p>

      {showCreateForm && <MenuForm onSubmitForm={onSubmitCreate} isCreating />}
      {editingId && <MenuForm onSubmitForm={onSubmitEdit} isCreating={false} />}

      {isLoading && <p className="text-sm text-gray-500">로딩 중...</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {flatList.length === 0 && !isLoading && (
          <p className="p-4 text-sm text-gray-400 text-center">메뉴 항목이 없습니다</p>
        )}
        {flatList.map((node, index) => (
          <div
            key={node.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
            className={`flex items-center gap-2 border-b transition-all ${
              dragIdx === index ? 'opacity-40' : ''
            } ${dropIdx === index && dragIdx !== index ? 'border-t-2 border-t-blue-500' : ''
            } ${!node.isVisible ? 'opacity-40' : ''
            } ${editingId === node.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            style={{ paddingLeft: `${0.75 + node.depth * 2}rem`, paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
          >
            {/* Drag handle */}
            <span className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 select-none" title="드래그하여 이동">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
            </span>

            {/* Depth indicator */}
            {node.depth > 0 && <span className="text-gray-300 text-xs">{'─'.repeat(node.depth)}</span>}

            {/* Label */}
            <span className="flex-1 text-sm font-medium truncate">{node.label}</span>

            {/* Page link info */}
            <span className="text-[10px] text-gray-400 hidden sm:inline truncate max-w-[120px]">
              {node.pageId ? pages?.find((p: any) => p.id === node.pageId)?.title || '' : node.externalUrl || ''}
            </span>

            {/* Level badge */}
            <span className={`text-[9px] px-1 py-0.5 rounded ${
              node.depth === 0 ? 'bg-blue-100 text-blue-600' : node.depth === 1 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
            }`}>{node.depth + 1}</span>

            {/* Indent/Outdent */}
            <button onClick={() => handleOutdent(index)} disabled={node.depth === 0} className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-20" title="상위로 ←">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => handleIndent(index)} disabled={index === 0 || node.depth >= 2} className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-20" title="하위로 →">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
            </button>

            <span className="w-px h-4 bg-gray-200" />

            {/* Visibility */}
            <button onClick={() => handleToggleVisibility(node)} className="p-0.5 text-gray-400 hover:text-gray-700" title={node.isVisible ? '숨기기' : '표시'}>
              {node.isVisible ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" /></svg>
              )}
            </button>

            {/* Edit / Delete */}
            <button onClick={() => handleEdit(node)} className="p-0.5 text-gray-400 hover:text-blue-600" title="편집">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={() => handleDelete(node)} className="p-0.5 text-gray-400 hover:text-red-600" title="삭제">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
