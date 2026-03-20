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
      className={`dw-flex dw-gap-1 dw-overflow-x-auto dw-border-b dw-border-border dw-pb-px ${className}`}
      role="tablist"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!selected}
        onClick={() => onSelect?.('')}
        className={`dw-whitespace-nowrap dw-px-4 dw-py-2 dw-text-sm dw-font-medium dw-transition-colors ${
          !selected
            ? 'dw-border-b-2 dw-border-primary dw-text-primary'
            : 'dw-text-text-secondary hover:dw-text-text-primary'
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
          className={`dw-whitespace-nowrap dw-px-4 dw-py-2 dw-text-sm dw-font-medium dw-transition-colors ${
            selected === dept.slug
              ? 'dw-border-b-2 dw-border-primary dw-text-primary'
              : 'dw-text-text-secondary hover:dw-text-text-primary'
          }`}
        >
          {dept.name}
        </button>
      ))}
    </div>
  );
}
