export interface HistoryYearTabsProps {
  years: number[];
  selected?: number;
  onSelect?: (year: number) => void;
  className?: string;
}

export function HistoryYearTabs({
  years,
  selected,
  onSelect,
  className = '',
}: HistoryYearTabsProps) {
  return (
    <div
      className={`dw-flex dw-gap-1 dw-overflow-x-auto dw-border-b dw-border-border dw-pb-px ${className}`}
      role="tablist"
    >
      {years.map((year) => (
        <button
          key={year}
          type="button"
          role="tab"
          aria-selected={selected === year}
          onClick={() => onSelect?.(year)}
          className={`dw-whitespace-nowrap dw-px-4 dw-py-2 dw-text-sm dw-font-medium dw-transition-colors ${
            selected === year
              ? 'dw-border-b-2 dw-border-primary dw-text-primary'
              : 'dw-text-text-secondary hover:dw-text-text-primary'
          }`}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
