export interface StaffDepartmentTabsProps {
  departments: { id: string; name: string; slug: string }[];
  selected?: string;
  onSelect?: (slug: string) => void;
  className?: string;
}

export function StaffDepartmentTabs({
  departments,
  selected,
  onSelect,
  className = '',
}: StaffDepartmentTabsProps) {
  return (
    <div
      className={`flex gap-1 overflow-x-auto border-b border-border pb-px ${className}`}
      role="tablist"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!selected}
        onClick={() => onSelect?.('')}
        className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
          !selected
            ? 'border-b-2 border-primary text-primary'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        전체
      </button>
      {departments.map((dept) => (
        <button
          key={dept.id}
          type="button"
          role="tab"
          aria-selected={selected === dept.slug}
          onClick={() => onSelect?.(dept.slug)}
          className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
            selected === dept.slug
              ? 'border-b-2 border-primary text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {dept.name}
        </button>
      ))}
    </div>
  );
}
