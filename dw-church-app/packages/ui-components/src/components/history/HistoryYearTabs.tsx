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
      className={`flex gap-1 overflow-x-auto border-b border-border pb-px ${className}`}
      role="tablist"
    >
      {years.map((year) => (
        <button
          key={year}
          type="button"
          role="tab"
          aria-selected={selected === year}
          onClick={() => onSelect?.(year)}
          className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
            selected === year
              ? 'border-b-2 border-primary text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
