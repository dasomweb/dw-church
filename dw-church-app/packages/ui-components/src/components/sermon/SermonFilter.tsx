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
    <div className={`dw-flex dw-flex-wrap dw-items-center dw-gap-3 ${className}`}>
      <select
        className="dw-rounded dw-border dw-border-border dw-bg-surface dw-px-3 dw-py-2 dw-text-sm dw-text-text-primary focus:dw-outline-none focus:dw-ring-2 focus:dw-ring-primary"
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
        className="dw-rounded dw-border dw-border-border dw-bg-surface dw-px-3 dw-py-2 dw-text-sm dw-text-text-primary focus:dw-outline-none focus:dw-ring-2 focus:dw-ring-primary"
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
