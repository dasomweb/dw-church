interface DividerBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function DividerBlock({ props }: DividerBlockProps) {
  const spacing = (props.spacing as 'sm' | 'md' | 'lg') ?? 'md';
  const spacingMap = { sm: 'py-4', md: 'py-8', lg: 'py-12' };

  return (
    <div className={`px-6 ${spacingMap[spacing]}`}>
      <hr className="mx-auto max-w-7xl border-gray-200" />
    </div>
  );
}
