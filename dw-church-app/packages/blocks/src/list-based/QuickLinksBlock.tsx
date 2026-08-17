import { SectionShell } from '../utilities/SectionShell';

interface QuickLinksBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

/**
 * quick_links — 사이드 "바로가기" 카드: 제목 + 화살표 링크 목록
 * (기도 요청 →, 소그룹 신청 →, 온라인 헌금 → 등). 프론트 샘플 04/05/11/12/20의
 * 우측 위젯 패턴. 각 항목 = 라벨(title) + 링크(content=URL).
 */
export function QuickLinksBlock({ props }: QuickLinksBlockProps) {
  const title = (props.title as string) ?? '';
  const items = Array.isArray(props.items) ? (props.items as Array<Record<string, unknown>>) : [];
  if (!title && items.length === 0) return null;

  return (
    <SectionShell props={props} style={{ paddingBlock: 'var(--section-py-md)' }} applyLayout>
      <div style={{ border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius-lg, 16px)', padding: '22px 24px' }}>
        {title && <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)', marginBottom: 12 }}>{title}</div>}
        <div className="flex flex-col">
          {items.map((it, i) => (
            <a
              key={i}
              href={String(it.content || '#')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border, #e5e7eb)',
                color: 'var(--fg)', textDecoration: 'none', fontSize: 15, fontWeight: 500,
              }}
            >
              <span>{String(it.title || '')}</span>
              <span style={{ color: 'var(--brand)', flex: 'none', marginLeft: 12 }}>→</span>
            </a>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
