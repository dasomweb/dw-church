import { useSermonCategories, useSermonPreachers } from '@dw-church/api-client';

export interface SermonFilterProps {
  selectedCategory?: string;
  selectedPreacher?: string;
  onCategoryChange?: (category: string) => void;
  onPreacherChange?: (id: string) => void;
  className?: string;
}

export function SermonFilter({
  selectedCategory,
  selectedPreacher,
  onCategoryChange,
  onPreacherChange,
  className = '',
}: SermonFilterProps) {
  const { data: categories } = useSermonCategories();
  const { data: preachers } = useSermonPreachers();

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <select
        className="rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        value={selectedCategory ?? ''}
        onChange={(e) => onCategoryChange?.(e.target.value)}
        aria-label="설교 카테고리"
      >
        <option value="">전체 카테고리</option>
        {categories?.map((cat) => (
          <option key={cat.id} value={cat.slug}>
            {cat.name}
          </option>
        ))}
      </select>

      <select
        className="rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        value={selectedPreacher ?? ''}
        onChange={(e) => {
          const value = e.target.value;
          onPreacherChange?.(value);
        }}
        aria-label="설교자"
      >
        <option value="">전체 설교자</option>
        {preachers?.map((preacher) => (
          <option key={preacher.id} value={preacher.id}>
            {preacher.name}
          </option>
        ))}
      </select>
    </div>
  );
}
