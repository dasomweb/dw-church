import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type { Page, PageSection, BlockType } from '@dw-church/api-client';
import {
  usePages,
  usePageSections,
  useCreatePage,
  useUpdatePage,
  useDeletePage,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  useReorderSections,
} from '@dw-church/api-client';
import type { BlockMeta, BlockCategory, PropSchema, PageTemplate } from '@dw-church/design-blocks';
import {
  getAllBlockMeta,
  getBlockMeta,
  getBlocksByCategory,
  BLOCK_CATEGORY_LABELS,
  templates,
  getTemplatesByCategory,
  TEMPLATE_CATEGORY_LABELS,
} from '@dw-church/design-blocks';

// ─── Dynamic Props Form (schema-driven) ──────────────────
function DynamicPropsForm({
  schema,
  props,
  onChange,
}: {
  schema: PropSchema[];
  props: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  const set = (key: string, value: unknown) => onChange({ ...props, [key]: value });

  if (schema.length === 0) {
    return (
      <div className="bg-gray-50 rounded p-3 text-sm text-gray-500">
        이 블록은 기본 설정으로 작동합니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schema.map((field) => {
        const value = props[field.key] ?? field.defaultValue ?? '';

        switch (field.type) {
          case 'string':
          case 'url':
          case 'image':
          case 'color':
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1">
                  {field.label}{field.required && <span className="text-red-400"> *</span>}
                </label>
                <input
                  type={field.type === 'color' ? 'color' : 'text'}
                  value={(value as string) || ''}
                  onChange={(e) => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full border rounded px-2 py-1.5 text-sm ${field.type === 'color' ? 'h-10' : ''}`}
                />
              </div>
            );

          case 'text':
          case 'rich_text':
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1">
                  {field.label}{field.required && <span className="text-red-400"> *</span>}
                </label>
                <textarea
                  value={(value as string) || ''}
                  onChange={(e) => set(field.key, e.target.value)}
                  rows={4}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
            );

          case 'number':
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1">
                  {field.label}{field.required && <span className="text-red-400"> *</span>}
                </label>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={(value as number) || 0}
                  onChange={(e) => set(field.key, parseFloat(e.target.value) || 0)}
                  className="w-32 border rounded px-2 py-1.5 text-sm"
                />
              </div>
            );

          case 'boolean':
            return (
              <div key={field.key}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => set(field.key, e.target.checked)}
                    className="rounded"
                  />
                  {field.label}
                </label>
              </div>
            );

          case 'select':
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1">{field.label}</label>
                <select
                  value={(value as string) || ''}
                  onChange={(e) => set(field.key, e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="">선택하세요</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            );

          case 'array':
            return (
              <ArrayField
                key={field.key}
                field={field}
                value={(value as Record<string, unknown>[]) || []}
                onChange={(arr) => set(field.key, arr)}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

// ─── Array field for nested schemas ──────────────────────
function ArrayField({
  field,
  value,
  onChange,
}: {
  field: PropSchema;
  value: Record<string, unknown>[];
  onChange: (arr: Record<string, unknown>[]) => void;
}) {
  const addItem = () => {
    const defaults: Record<string, unknown> = {};
    field.arrayItemSchema?.forEach((s) => { defaults[s.key] = s.defaultValue ?? ''; });
    onChange([...value, defaults]);
  };

  const removeItem = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const updateItem = (idx: number, key: string, val: unknown) => {
    const updated = [...value];
    updated[idx] = { ...updated[idx], [key]: val };
    onChange(updated);
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-2">{field.label}</label>
      {value.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-end mb-2 p-2 bg-gray-50 rounded">
          {field.arrayItemSchema?.map((sub) => (
            <div key={sub.key} className="flex-1">
              <label className="block text-[10px] text-gray-500">{sub.label}</label>
              {sub.type === 'text' ? (
                <textarea
                  value={(item[sub.key] as string) || ''}
                  onChange={(e) => updateItem(idx, sub.key, e.target.value)}
                  rows={2}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              ) : (
                <input
                  value={(item[sub.key] as string) || ''}
                  onChange={(e) => updateItem(idx, sub.key, e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => removeItem(idx)}
            className="text-red-500 hover:text-red-700 text-sm px-2 py-1 flex-shrink-0"
          >
            삭제
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        + 항목 추가
      </button>
    </div>
  );
}

// ─── Block label/icon helpers (registry-driven) ──────────
function getBlockLabel(type: BlockType): string {
  return getBlockMeta(type)?.label ?? type;
}

function getBlockIcon(type: BlockType): string {
  const meta = getBlockMeta(type);
  if (!meta) return '?';
  return meta.icon.length <= 2 ? meta.icon.toUpperCase() : meta.icon.charAt(0).toUpperCase();
}

// ─── Build categories from registry ──────────────────────
function useBlockCategories() {
  return useMemo(() => {
    const categoryOrder: BlockCategory[] = [
      'hero', 'about', 'content_grid', 'text', 'gallery',
      'staff', 'timeline', 'schedule', 'contact', 'newcomer',
      'cta', 'footer', 'layout',
    ];
    return categoryOrder
      .map((cat) => {
        const entries = getBlocksByCategory(cat);
        // Filter out legacy aliases (no propsSchema)
        const blocks = entries
          .filter((e) => e.meta.propsSchema.length > 0 || !e.meta.label.includes('레거시'))
          .map((e) => e.meta);
        return {
          category: cat,
          label: BLOCK_CATEGORY_LABELS[cat]?.ko ?? cat,
          blocks,
        };
      })
      .filter((c) => c.blocks.length > 0);
  }, []);
}

// ─── Template Gallery ────────────────────────────────────
function TemplateGallery({ onSelect, onClose }: { onSelect: (t: PageTemplate) => void; onClose: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = selectedCategory === 'all'
    ? templates
    : templates.filter((t) => t.category === selectedCategory);

  const categories = Object.entries(TEMPLATE_CATEGORY_LABELS);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold">템플릿으로 시작하기</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          {categories.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label.ko}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="text-left border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg mb-3 flex items-center justify-center">
                  <span className="text-2xl opacity-50">{TEMPLATE_CATEGORY_LABELS[t.category]?.ko?.charAt(0) || '?'}</span>
                </div>
                <h4 className="font-bold text-sm group-hover:text-blue-600 transition-colors">{t.name}</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                <div className="flex gap-1 mt-2">
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {t.sections.length}개 섹션
                  </span>
                </div>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-12">이 카테고리에 템플릿이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page form ───────────────────────────────────────────
interface PageFormData {
  title: string;
  slug: string;
  status: 'draft' | 'published';
  isHome: boolean;
}

// ─── Main component ─────────────────────────────────────
export default function PageEditor() {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionProps, setSectionProps] = useState<Record<string, Record<string, unknown>>>({});
  const [showPageForm, setShowPageForm] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  const blockCategories = useBlockCategories();
  const { data: pages, isLoading: pagesLoading } = usePages();
  const { data: sections } = usePageSections(selectedPageId || '');
  const createPage = useCreatePage();
  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const reorderSections = useReorderSections();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PageFormData>();

  const selectedPage = pages?.find((p) => p.id === selectedPageId) ?? null;
  const sortedSections = [...(sections || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleSelectPage = (page: Page) => {
    setSelectedPageId(page.id);
    setEditingSectionId(null);
    setShowAddBlock(false);
    setSectionProps({});
  };

  const handleCreatePage = () => {
    reset({ title: '', slug: '', status: 'draft', isHome: false });
    setShowPageForm(true);
  };

  const handleEditPage = () => {
    if (!selectedPage) return;
    reset({ title: selectedPage.title, slug: selectedPage.slug, status: selectedPage.status, isHome: selectedPage.isHome });
    setShowPageForm(true);
  };

  const onSubmitPage = (data: PageFormData) => {
    if (selectedPage) {
      updatePage.mutate(
        { id: selectedPage.id, data: { ...data, sortOrder: selectedPage.sortOrder } },
        { onSuccess: () => setShowPageForm(false) },
      );
    } else {
      createPage.mutate(
        { ...data, sortOrder: (pages?.length || 0) },
        {
          onSuccess: (newPage) => {
            setShowPageForm(false);
            setSelectedPageId(newPage.id);
          },
        },
      );
    }
  };

  const handleDeletePage = () => {
    if (!selectedPage) return;
    if (window.confirm(`"${selectedPage.title}" 페이지를 삭제하시겠습니까?`)) {
      deletePage.mutate(selectedPage.id, {
        onSuccess: () => setSelectedPageId(null),
      });
    }
  };

  const handleAddSection = (blockType: BlockType) => {
    if (!selectedPageId) return;
    const meta = getBlockMeta(blockType);
    createSection.mutate({
      pageId: selectedPageId,
      data: {
        blockType,
        props: meta?.defaultProps ?? {},
        sortOrder: sortedSections.length,
        isVisible: true,
      },
    });
    setShowAddBlock(false);
  };

  const handleApplyTemplate = (template: PageTemplate) => {
    if (!selectedPageId) return;
    template.sections.forEach((sec, i) => {
      createSection.mutate({
        pageId: selectedPageId,
        data: {
          blockType: sec.blockType,
          props: sec.defaultProps,
          sortOrder: sortedSections.length + i,
          isVisible: sec.isVisible,
        },
      });
    });
    setShowTemplateGallery(false);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (!selectedPageId || !sections) return;
    const sorted = [...sortedSections];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[index]!, b = sorted[swapIdx]!;
    sorted[index] = b; sorted[swapIdx] = a;
    reorderSections.mutate({
      pageId: selectedPageId,
      orderedIds: sorted.map((s) => s.id),
    });
  };

  const handleDeleteSection = (section: PageSection) => {
    if (!selectedPageId) return;
    if (window.confirm('이 섹션을 삭제하시겠습니까?')) {
      deleteSection.mutate({ pageId: selectedPageId, sectionId: section.id });
      if (editingSectionId === section.id) setEditingSectionId(null);
    }
  };

  const handleSaveSectionProps = (section: PageSection) => {
    if (!selectedPageId) return;
    const props = sectionProps[section.id] ?? section.props;
    updateSection.mutate({
      pageId: selectedPageId,
      sectionId: section.id,
      data: { props },
    });
    setEditingSectionId(null);
  };

  const handleToggleVisibility = (section: PageSection) => {
    if (!selectedPageId) return;
    updateSection.mutate({
      pageId: selectedPageId,
      sectionId: section.id,
      data: { isVisible: !section.isVisible },
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Left sidebar - page list */}
      <div className="w-64 flex-shrink-0 bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold">페이지 목록</h3>
          <button
            onClick={handleCreatePage}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
          >
            + 추가
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {pagesLoading && <p className="p-4 text-sm text-gray-500">로딩 중...</p>}
          {pages?.sort((a, b) => a.sortOrder - b.sortOrder).map((page) => (
            <button
              key={page.id}
              onClick={() => handleSelectPage(page)}
              className={`w-full text-left px-4 py-3 border-b text-sm hover:bg-gray-50 transition-colors ${
                selectedPageId === page.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
              }`}
            >
              <div className="font-medium truncate">{page.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                /{page.slug}
                {page.isHome && <span className="ml-1 text-blue-600">(홈)</span>}
                {page.status === 'draft' && <span className="ml-1 text-amber-600">(임시)</span>}
              </div>
            </button>
          ))}
          {pages?.length === 0 && (
            <p className="p-4 text-sm text-gray-400">페이지가 없습니다</p>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto">
        {!selectedPage ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <p className="text-sm">왼쪽에서 페이지를 선택하세요</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Page header */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{selectedPage.title}</h2>
                <p className="text-sm text-gray-500">/{selectedPage.slug}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTemplateGallery(true)}
                  className="text-sm px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                >
                  템플릿 적용
                </button>
                <button
                  onClick={handleEditPage}
                  className="text-sm px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200"
                >
                  페이지 수정
                </button>
                <button
                  onClick={handleDeletePage}
                  className="text-sm px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  삭제
                </button>
              </div>
            </div>

            {/* Sections */}
            {sortedSections.map((section, index) => {
              const meta = getBlockMeta(section.blockType);
              return (
                <div
                  key={section.id}
                  className={`bg-white border rounded-lg overflow-hidden ${
                    !section.isVisible ? 'opacity-60' : ''
                  } ${editingSectionId === section.id ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'}`}
                >
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b">
                    <span className="w-8 h-8 bg-blue-100 text-blue-700 text-xs font-bold rounded flex items-center justify-center">
                      {getBlockIcon(section.blockType)}
                    </span>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{getBlockLabel(section.blockType)}</span>
                      {meta?.category && (
                        <span className="ml-2 text-[10px] text-gray-400">
                          {BLOCK_CATEGORY_LABELS[meta.category]?.ko}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleMoveSection(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="위로">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button onClick={() => handleMoveSection(index, 'down')} disabled={index === sortedSections.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="아래로">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button onClick={() => handleToggleVisibility(section)} className="p-1 text-gray-400 hover:text-gray-700" title={section.isVisible ? '숨기기' : '표시'}>
                        {section.isVisible ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        )}
                      </button>
                      <button
                        onClick={() => setEditingSectionId(editingSectionId === section.id ? null : section.id)}
                        className={`p-1 hover:text-gray-700 ${editingSectionId === section.id ? 'text-blue-600' : 'text-gray-400'}`}
                        title="편집"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteSection(section)} className="p-1 text-gray-400 hover:text-red-600" title="삭제">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>

                  {editingSectionId === section.id && (
                    <div className="p-4 border-t bg-white">
                      <DynamicPropsForm
                        schema={meta?.propsSchema ?? []}
                        props={sectionProps[section.id] ?? section.props}
                        onChange={(p) => setSectionProps((prev) => ({ ...prev, [section.id]: p }))}
                      />
                      <div className="flex gap-2 mt-4 pt-3 border-t">
                        <button
                          onClick={() => handleSaveSectionProps(section)}
                          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingSectionId(null)}
                          className="px-4 py-1.5 bg-gray-200 text-sm rounded hover:bg-gray-300"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add section button */}
            <div className="relative">
              <button
                onClick={() => setShowAddBlock(!showAddBlock)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                + 섹션 추가
              </button>

              {showAddBlock && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                  {blockCategories.map((category) => (
                    <div key={category.category}>
                      <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {category.label}
                      </div>
                      {category.blocks.map((block) => (
                        <button
                          key={block.type}
                          onClick={() => handleAddSection(block.type)}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 text-sm"
                        >
                          <span className="w-7 h-7 bg-blue-100 text-blue-700 text-xs font-bold rounded flex items-center justify-center flex-shrink-0">
                            {block.icon.length <= 2 ? block.icon.toUpperCase() : block.icon.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <span className="font-medium">{block.label}</span>
                            <span className="text-xs text-gray-400 ml-2">{block.description}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Template gallery modal */}
      {showTemplateGallery && (
        <TemplateGallery
          onSelect={handleApplyTemplate}
          onClose={() => setShowTemplateGallery(false)}
        />
      )}

      {/* Page form modal */}
      {showPageForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">
              {selectedPage ? '페이지 수정' : '새 페이지'}
            </h3>
            <form onSubmit={handleSubmit(onSubmitPage)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">제목</label>
                <input
                  {...register('title', { required: '제목을 입력하세요' })}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <input
                  {...register('slug', { required: 'slug를 입력하세요' })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="about-us"
                />
                {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug.message}</p>}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">상태</label>
                  <select {...register('status')} className="w-full border rounded px-3 py-2 text-sm">
                    <option value="draft">임시저장</option>
                    <option value="published">공개</option>
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...register('isHome')} className="rounded" />
                    홈 페이지
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={createPage.isPending || updatePage.isPending}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  저장
                </button>
                <button type="button" onClick={() => setShowPageForm(false)} className="px-4 py-2 bg-gray-200 text-sm rounded hover:bg-gray-300">
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
