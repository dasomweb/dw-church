import { useState } from 'react';
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

// ─── Block type definitions ───────────────────────────────────
const BLOCK_CATEGORIES: { label: string; types: { type: BlockType; label: string; icon: string }[] }[] = [
  {
    label: '콘텐츠',
    types: [
      { type: 'hero_banner', label: '히어로 배너', icon: 'B' },
      { type: 'text_image', label: '텍스트+이미지', icon: 'TI' },
      { type: 'text_only', label: '텍스트', icon: 'T' },
      { type: 'image_gallery', label: '이미지 갤러리', icon: 'IG' },
      { type: 'video', label: '비디오', icon: 'V' },
      { type: 'divider', label: '구분선', icon: '—' },
    ],
  },
  {
    label: 'CPT 블록',
    types: [
      { type: 'recent_sermons', label: '최근 설교', icon: 'RS' },
      { type: 'recent_bulletins', label: '최근 주보', icon: 'RB' },
      { type: 'album_gallery', label: '앨범 갤러리', icon: 'AG' },
      { type: 'staff_grid', label: '교역자 그리드', icon: 'SG' },
      { type: 'history_timeline', label: '연혁 타임라인', icon: 'HT' },
      { type: 'event_grid', label: '이벤트 그리드', icon: 'EG' },
    ],
  },
  {
    label: '교회 정보',
    types: [
      { type: 'worship_schedule', label: '예배 시간', icon: 'WS' },
      { type: 'location_map', label: '찾아오는 길', icon: 'LM' },
      { type: 'contact_info', label: '연락처 정보', icon: 'CI' },
      { type: 'newcomer_info', label: '새가족 안내', icon: 'NI' },
    ],
  },
  {
    label: '레이아웃',
    types: [
      { type: 'two_columns', label: '2단 레이아웃', icon: '2C' },
      { type: 'three_columns', label: '3단 레이아웃', icon: '3C' },
      { type: 'tabs', label: '탭', icon: 'TB' },
      { type: 'accordion', label: '아코디언', icon: 'AC' },
    ],
  },
];

const ALL_BLOCK_TYPES = BLOCK_CATEGORIES.flatMap((c) => c.types);

function getBlockLabel(type: BlockType): string {
  return ALL_BLOCK_TYPES.find((b) => b.type === type)?.label ?? type;
}

function getBlockIcon(type: BlockType): string {
  return ALL_BLOCK_TYPES.find((b) => b.type === type)?.icon ?? '?';
}

// ─── Section props form per blockType ────────────────────────
function SectionPropsForm({
  blockType,
  props,
  onChange,
}: {
  blockType: BlockType;
  props: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  const set = (key: string, value: unknown) => onChange({ ...props, [key]: value });

  switch (blockType) {
    case 'text_image':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">제목</label>
            <input
              value={(props.title as string) || ''}
              onChange={(e) => set('title', e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">내용</label>
            <textarea
              value={(props.content as string) || ''}
              onChange={(e) => set('content', e.target.value)}
              rows={4}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">이미지 URL</label>
            <input
              value={(props.imageUrl as string) || ''}
              onChange={(e) => set('imageUrl', e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">레이아웃</label>
            <div className="flex gap-4">
              {(['left', 'right', 'center'] as const).map((layout) => (
                <label key={layout} className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="text_image_layout"
                    checked={props.layout === layout}
                    onChange={() => set('layout', layout)}
                  />
                  {layout === 'left' ? '왼쪽' : layout === 'right' ? '오른쪽' : '중앙'}
                </label>
              ))}
            </div>
          </div>
        </div>
      );

    case 'worship_schedule': {
      const schedules = (props.schedules as { name: string; time: string; location: string }[]) || [];
      return (
        <div className="space-y-3">
          <label className="block text-xs font-medium">예배 시간표</label>
          {schedules.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500">예배명</label>
                <input
                  value={item.name}
                  onChange={(e) => {
                    const updated = [...schedules];
                    updated[idx] = { ...item, name: e.target.value };
                    set('schedules', updated);
                  }}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500">시간</label>
                <input
                  value={item.time}
                  onChange={(e) => {
                    const updated = [...schedules];
                    updated[idx] = { ...item, time: e.target.value };
                    set('schedules', updated);
                  }}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500">장소</label>
                <input
                  value={item.location}
                  onChange={(e) => {
                    const updated = [...schedules];
                    updated[idx] = { ...item, location: e.target.value };
                    set('schedules', updated);
                  }}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => set('schedules', schedules.filter((_, i) => i !== idx))}
                className="text-red-500 hover:text-red-700 text-sm px-2 py-1"
              >
                삭제
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set('schedules', [...schedules, { name: '', time: '', location: '' }])}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + 예배 추가
          </button>
        </div>
      );
    }

    case 'location_map':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">주소</label>
            <input
              value={(props.address as string) || ''}
              onChange={(e) => set('address', e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">설명</label>
            <textarea
              value={(props.description as string) || ''}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      );

    case 'hero_banner':
      return (
        <div className="bg-gray-50 rounded p-3 text-sm text-gray-600">
          배너 CPT에서 관리됩니다. 배너 관리 페이지에서 수정하세요.
        </div>
      );

    // CPT blocks: just limit and optional filter
    case 'recent_sermons':
    case 'recent_bulletins':
    case 'album_gallery':
    case 'staff_grid':
    case 'history_timeline':
    case 'event_grid':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">표시 개수</label>
            <input
              type="number"
              min={1}
              max={50}
              value={(props.limit as number) || 6}
              onChange={(e) => set('limit', parseInt(e.target.value) || 6)}
              className="w-32 border rounded px-2 py-1.5 text-sm"
            />
          </div>
          {(blockType === 'recent_sermons') && (
            <div>
              <label className="block text-xs font-medium mb-1">카테고리 slug (선택)</label>
              <input
                value={(props.categorySlug as string) || ''}
                onChange={(e) => set('categorySlug', e.target.value)}
                placeholder="예: sunday-sermon"
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
          )}
        </div>
      );

    // Simple blocks
    case 'text_only':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">제목</label>
            <input
              value={(props.title as string) || ''}
              onChange={(e) => set('title', e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">내용</label>
            <textarea
              value={(props.content as string) || ''}
              onChange={(e) => set('content', e.target.value)}
              rows={6}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      );

    case 'video':
      return (
        <div>
          <label className="block text-xs font-medium mb-1">YouTube URL</label>
          <input
            value={(props.youtubeUrl as string) || ''}
            onChange={(e) => set('youtubeUrl', e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>
      );

    case 'image_gallery':
      return (
        <div>
          <label className="block text-xs font-medium mb-1">이미지 URLs (한 줄에 하나)</label>
          <textarea
            value={((props.images as string[]) || []).join('\n')}
            onChange={(e) => set('images', e.target.value.split('\n').filter(Boolean))}
            rows={4}
            className="w-full border rounded px-2 py-1.5 text-sm font-mono"
            placeholder="https://example.com/img1.jpg"
          />
        </div>
      );

    default:
      return (
        <div className="bg-gray-50 rounded p-3 text-sm text-gray-500">
          이 블록 유형의 설정은 기본 설정으로 작동합니다.
        </div>
      );
  }
}

// ─── Page form ───────────────────────────────────────────────
interface PageFormData {
  title: string;
  slug: string;
  status: 'draft' | 'published';
  isHome: boolean;
}

// ─── Main component ─────────────────────────────────────────
export default function PageEditor() {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionProps, setSectionProps] = useState<Record<string, Record<string, unknown>>>({});
  const [showPageForm, setShowPageForm] = useState(false);

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
    createSection.mutate({
      pageId: selectedPageId,
      data: {
        blockType,
        props: {},
        sortOrder: sortedSections.length,
        isVisible: true,
      },
    });
    setShowAddBlock(false);
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
            {sortedSections.map((section, index) => (
              <div
                key={section.id}
                className={`bg-white border rounded-lg overflow-hidden ${
                  !section.isVisible ? 'opacity-60' : ''
                } ${editingSectionId === section.id ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'}`}
              >
                {/* Section header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b">
                  <span className="w-8 h-8 bg-blue-100 text-blue-700 text-xs font-bold rounded flex items-center justify-center">
                    {getBlockIcon(section.blockType)}
                  </span>
                  <span className="text-sm font-medium flex-1">
                    {getBlockLabel(section.blockType)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleMoveSection(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title="위로"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button
                      onClick={() => handleMoveSection(index, 'down')}
                      disabled={index === sortedSections.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title="아래로"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(section)}
                      className="p-1 text-gray-400 hover:text-gray-700"
                      title={section.isVisible ? '숨기기' : '표시'}
                    >
                      {section.isVisible ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setEditingSectionId(editingSectionId === section.id ? null : section.id)
                      }
                      className={`p-1 hover:text-gray-700 ${editingSectionId === section.id ? 'text-blue-600' : 'text-gray-400'}`}
                      title="편집"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      onClick={() => handleDeleteSection(section)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>

                {/* Section edit form */}
                {editingSectionId === section.id && (
                  <div className="p-4 border-t bg-white">
                    <SectionPropsForm
                      blockType={section.blockType}
                      props={sectionProps[section.id] ?? section.props}
                      onChange={(p) =>
                        setSectionProps((prev) => ({ ...prev, [section.id]: p }))
                      }
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
            ))}

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
                  {BLOCK_CATEGORIES.map((category) => (
                    <div key={category.label}>
                      <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {category.label}
                      </div>
                      {category.types.map((block) => (
                        <button
                          key={block.type}
                          onClick={() => handleAddSection(block.type)}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 text-sm"
                        >
                          <span className="w-7 h-7 bg-blue-100 text-blue-700 text-xs font-bold rounded flex items-center justify-center flex-shrink-0">
                            {block.icon}
                          </span>
                          {block.label}
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
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <input
                  {...register('slug', { required: 'slug를 입력하세요' })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="about-us"
                />
                {errors.slug && (
                  <p className="text-red-500 text-sm mt-1">{errors.slug.message}</p>
                )}
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
                <button
                  type="button"
                  onClick={() => setShowPageForm(false)}
                  className="px-4 py-2 bg-gray-200 text-sm rounded hover:bg-gray-300"
                >
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
