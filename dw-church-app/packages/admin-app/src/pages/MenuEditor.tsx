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
import { useToast } from '../components';

interface MenuFormData {
  label: string;
  pageId: string;
  externalUrl: string;
  parentId: string;
  isVisible: boolean;
}

type TreeNode = MenuItem & { children: TreeNode[] };

function buildTree(items: MenuItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

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

  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const n of nodes) sortNodes(n.children);
    return nodes;
  };

  return sortNodes(roots);
}

function getSiblings(tree: TreeNode[], parentId: string | null): TreeNode[] {
  if (!parentId) return tree;
  const find = (nodes: TreeNode[]): TreeNode[] | null => {
    for (const n of nodes) {
      if (n.id === parentId) return n.children;
      const found = find(n.children);
      if (found) return found;
    }
    return null;
  };
  return find(tree) || [];
}

function flattenTree(tree: TreeNode[]): { id: string; parentId: string | null; sortOrder: number }[] {
  const result: { id: string; parentId: string | null; sortOrder: number }[] = [];
  const walk = (nodes: TreeNode[], parentId: string | null) => {
    nodes.forEach((node, i) => {
      result.push({ id: node.id, parentId, sortOrder: i });
      walk(node.children, node.id);
    });
  };
  walk(tree, null);
  return result;
}

export default function MenuEditor() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { showToast } = useToast();
  const { data: menuItems, isLoading } = useMenus();
  const { data: pages } = usePages();
  const createMenu = useCreateMenu();
  const updateMenu = useUpdateMenu();
  const deleteMenu = useDeleteMenu();
  const reorderMenus = useReorderMenus();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<MenuFormData>();
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
      deleteMenu.mutate(item.id, {
        onSuccess: () => showToast('success', '삭제되었습니다.'),
      });
      if (editingId === item.id) setEditingId(null);
    }
  };

  // Move within same level (siblings)
  const handleMove = (node: TreeNode, direction: 'up' | 'down') => {
    const siblings = getSiblings(tree, node.parentId || null);
    const idx = siblings.findIndex((s) => s.id === node.id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    [siblings[idx], siblings[swapIdx]] = [siblings[swapIdx], siblings[idx]];
    const flat = flattenTree(tree);
    reorderMenus.mutate(flat.map((f) => f.id), {
      onSuccess: () => showToast('success', '순서가 변경되었습니다.'),
    });
  };

  // Indent (make child of previous sibling)
  const handleIndent = (node: TreeNode) => {
    const siblings = getSiblings(tree, node.parentId || null);
    const idx = siblings.findIndex((s) => s.id === node.id);
    if (idx <= 0) return; // Can't indent first item
    const newParent = siblings[idx - 1];
    updateMenu.mutate({
      id: node.id,
      data: { parentId: newParent.id },
    }, {
      onSuccess: () => showToast('success', '하위 메뉴로 변경되었습니다.'),
    });
  };

  // Outdent (move to parent's level)
  const handleOutdent = (node: TreeNode) => {
    if (!node.parentId) return; // Already top level
    // Find parent's parentId
    const findParentOf = (nodes: TreeNode[], targetId: string): string | null | undefined => {
      for (const n of nodes) {
        if (n.id === targetId) return undefined; // root level
        for (const c of n.children) {
          if (c.id === targetId) return n.parentId || null;
          const found = findParentOf(n.children, targetId);
          if (found !== undefined) return found;
        }
      }
      return undefined;
    };
    const grandParentId = findParentOf(tree, node.parentId);
    if (grandParentId === undefined) {
      // Parent is root level, outdent to root
      updateMenu.mutate({
        id: node.id,
        data: { parentId: null as any },
      }, {
        onSuccess: () => showToast('success', '상위 레벨로 변경되었습니다.'),
      });
    } else {
      updateMenu.mutate({
        id: node.id,
        data: { parentId: grandParentId },
      }, {
        onSuccess: () => showToast('success', '상위 레벨로 변경되었습니다.'),
      });
    }
  };

  const handleToggleVisibility = (item: MenuItem) => {
    updateMenu.mutate({ id: item.id, data: { isVisible: !item.isVisible } });
  };

  const onSubmitCreate = (data: MenuFormData) => {
    createMenu.mutate({
      label: data.label,
      pageId: data.pageId || undefined,
      externalUrl: data.externalUrl || undefined,
      parentId: data.parentId || undefined,
      sortOrder: flatItems.length,
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
        parentId: data.parentId || undefined,
        isVisible: data.isVisible,
      },
    }, {
      onSuccess: () => { setEditingId(null); showToast('success', '저장되었습니다.'); },
    });
  };

  const getDepthLabel = (depth: number) => {
    if (depth === 0) return '';
    return depth === 1 ? '└ ' : '  └ ';
  };

  const MenuItemRow = ({ item, depth = 0 }: { item: TreeNode; depth?: number }) => {
    const siblings = getSiblings(tree, item.parentId || null);
    const idx = siblings.findIndex((s) => s.id === item.id);
    const isFirst = idx === 0;
    const isLast = idx === siblings.length - 1;
    const canIndent = idx > 0 && depth < 2; // Max 3 levels (0,1,2)
    const canOutdent = depth > 0;

    return (
      <>
        <div
          className={`flex items-center gap-2 px-4 py-2.5 border-b hover:bg-gray-50 transition-colors ${
            !item.isVisible ? 'opacity-40' : ''
          } ${editingId === item.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
          style={{ paddingLeft: `${1 + depth * 1.5}rem` }}
        >
          {/* Depth indicator */}
          <span className="text-gray-300 text-xs w-4">{getDepthLabel(depth)}</span>

          {/* Level badge */}
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            depth === 0 ? 'bg-blue-100 text-blue-700' : depth === 1 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {depth + 1}단계
          </span>

          {/* Label */}
          <span className="flex-1 text-sm font-medium">{item.label}</span>

          {/* Page link */}
          <span className="text-xs text-gray-400 hidden sm:inline">
            {item.pageId
              ? pages?.find((p: any) => p.id === item.pageId)?.title || ''
              : item.externalUrl || ''}
          </span>

          {/* Actions */}
          <div className="flex gap-0.5">
            {/* Move up/down within siblings */}
            <button onClick={() => handleMove(item, 'up')} disabled={isFirst} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20" title="위로">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 15l7-7 7 7" /></svg>
            </button>
            <button onClick={() => handleMove(item, 'down')} disabled={isLast} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20" title="아래로">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
            </button>

            {/* Indent/Outdent */}
            <button onClick={() => handleIndent(item)} disabled={!canIndent} className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-20" title="하위로 이동 →">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 7l5 5-5 5M6 17V7" /></svg>
            </button>
            <button onClick={() => handleOutdent(item)} disabled={!canOutdent} className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-20" title="상위로 이동 ←">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 17l-5-5 5-5M18 7v10" /></svg>
            </button>

            <span className="w-px bg-gray-200 mx-0.5" />

            {/* Visibility */}
            <button onClick={() => handleToggleVisibility(item)} className="p-1 text-gray-400 hover:text-gray-700" title={item.isVisible ? '숨기기' : '표시'}>
              {item.isVisible ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" /></svg>
              )}
            </button>

            {/* Edit / Delete */}
            <button onClick={() => handleEdit(item)} className="p-1 text-gray-400 hover:text-blue-600" title="편집">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={() => handleDelete(item)} className="p-1 text-gray-400 hover:text-red-600" title="삭제">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        {item.children.map((child) => (
          <MenuItemRow key={child.id} item={child} depth={depth + 1} />
        ))}
      </>
    );
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
          <label className="block text-xs font-medium mb-1">상위 메뉴</label>
          <select {...register('parentId')} className="w-full border rounded px-3 py-2 text-sm">
            <option value="">(최상위 - 1단계)</option>
            {flatItems.filter((m) => m.id !== editingId && !m.parentId).map((m) => (
              <option key={m.id} value={m.id}>└ {m.label} (2단계)</option>
            ))}
            {flatItems.filter((m) => m.id !== editingId && m.parentId && !flatItems.find((p) => p.id === m.parentId)?.parentId).map((m) => (
              <option key={m.id} value={m.id}>{'  └ '}{m.label} (3단계)</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">페이지 연결</label>
          <select {...register('pageId')} className="w-full border rounded px-3 py-2 text-sm">
            <option value="">(선택 안함)</option>
            {pages?.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">외부 URL</label>
          <input {...register('externalUrl')} placeholder="https://..." disabled={!!watchPageId} className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100" />
        </div>
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

      <p className="text-xs text-gray-500">▲▼ 순서 변경 | → 하위로 이동 | ← 상위로 이동 | 최대 3단계</p>

      {showCreateForm && <MenuForm onSubmitForm={onSubmitCreate} isCreating />}
      {editingId && <MenuForm onSubmitForm={onSubmitEdit} isCreating={false} />}

      {isLoading && <p className="text-sm text-gray-500">로딩 중...</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {tree.length === 0 && !isLoading && (
          <p className="p-4 text-sm text-gray-400 text-center">메뉴 항목이 없습니다</p>
        )}
        {tree.map((item) => (
          <MenuItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
