/**
 * WorshipScheduleBlock (예배 시간) — church static block in the shared set.
 * Title (token-driven heading) + a service-times table. The header row +
 * accents read the brand color tokens so the theme color set applies.
 *
 * `services` is an operator-entered list (props), so this renders fully
 * in-process in the builder canvas (no data fetch).
 */
import { HeadingElement, EyebrowElement } from '../elements';
import { SectionShell } from '../utilities/SectionShell';

interface Service {
  name: string;
  time: string;
  location: string;
}

interface WorshipScheduleBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function WorshipScheduleBlock({ props }: WorshipScheduleBlockProps) {
  const services = (props.services as Service[]) ?? [];
  const title = (props.title as string) || '예배 안내';
  const eyebrow = (props.eyebrow as string) ?? '';

  return (
    <SectionShell
      props={props}
      applyLayout
      style={{ paddingBlock: 'var(--section-py-md)' }}
      defaultContentClass="mx-auto max-w-4xl px-4 sm:px-6"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 1.5rem)' }}>
        <div className="text-center flex flex-col items-center gap-2">
          <EyebrowElement text={eyebrow} props={props} elementKey="eyebrow" />
          <HeadingElement text={title} props={props} elementKey="title" defaultTag="h2" defaultSize="h2" />
          <span aria-hidden="true" style={{ display: 'block', width: 48, height: 3, borderRadius: 2, backgroundColor: 'var(--brand-primary, var(--dw-primary, #2563eb))' }} />
        </div>
        {services.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--brand-muted, #94a3b8)', fontSize: 'var(--fs-sm)' }}>
            예배 시간이 등록되지 않았습니다.
          </p>
        ) : (
          <div
            className="overflow-x-auto"
            style={{ borderRadius: 'var(--r-lg, var(--brand-radius-lg, 16px))', border: '1px solid var(--brand-border, #e2e8f0)' }}
          >
            <table className="w-full min-w-[480px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--brand-primary, var(--dw-primary, #2563eb))' }}>
                  {['예배', '시간', '장소'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left sm:px-6 sm:py-4"
                      style={{ color: 'var(--brand-primary-fg, #fff)', fontSize: 'var(--fs-sm)', fontWeight: 600, fontFamily: 'var(--brand-font-heading)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {services.map((service, idx) => (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'var(--brand-background, #fff)' : 'var(--brand-surface, #f8fafc)' }}>
                    <td className="px-4 py-3 sm:px-6 sm:py-4" style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, fontFamily: 'var(--brand-font-body)' }}>{service.name}</td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4" style={{ fontSize: 'var(--fs-sm)', color: 'var(--brand-muted, #64748b)', fontFamily: 'var(--brand-font-body)' }}>{service.time}</td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4" style={{ fontSize: 'var(--fs-sm)', color: 'var(--brand-muted, #64748b)', fontFamily: 'var(--brand-font-body)' }}>{service.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionShell>
  );
}
