/**
 * GivingInfoBlock (헌금 안내) — church static block in the shared set.
 *
 * NOT a payment processor — it's an INFO page that tells members HOW to give:
 * Zelle id, a mailing address for checks, bank transfer info, and an optional
 * QR image. Each method renders only when its field is filled. All fields are
 * text + image so the tenant content-only editor can edit them.
 */
import { HeadingElement, TextBodyElement, ImageElement } from '../elements';
import { SectionShell } from '../utilities/SectionShell';

interface GivingInfoBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

export function GivingInfoBlock({ props }: GivingInfoBlockProps) {
  const title = (props.title as string) ?? '헌금 안내';
  const intro = (props.intro as string) ?? '';
  const zelle = ((props.zelle as string) ?? '').trim();
  const bankInfo = ((props.bankInfo as string) ?? '').trim();
  const mailingName = ((props.mailingName as string) ?? '').trim();
  const mailingAddress = ((props.mailingAddress as string) ?? '').trim();
  const note = (props.note as string) ?? '';
  const qrImageUrl = ((props.qrImageUrl as string) ?? '').trim();

  // (label, value, multiline) — only the methods the church filled in.
  const methods: { label: string; value: string; multiline?: boolean }[] = [];
  if (zelle) methods.push({ label: 'Zelle', value: zelle });
  if (bankInfo) methods.push({ label: '계좌 이체', value: bankInfo, multiline: true });
  if (mailingName || mailingAddress) {
    methods.push({
      label: '우편 (체크)',
      value: [mailingName, mailingAddress].filter(Boolean).join('\n'),
      multiline: true,
    });
  }

  return (
    <SectionShell
      props={props}
      applyLayout
      style={{ paddingBlock: 'var(--section-py-md)' }}
      defaultContentClass="mx-auto max-w-3xl px-4 sm:px-6"
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--block-gap, 1rem)' }}>
        <HeadingElement text={title} props={props} elementKey="title" defaultTag="h2" defaultSize="h2" />
        {intro ? (
          <TextBodyElement
            text={intro}
            props={props}
            elementKey="intro"
            defaultTag="div"
            defaultSize="body"
            html
            className="prose mx-auto text-center"
          />
        ) : null}

        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginTop: '0.5rem',
          }}
        >
          {methods.map((m) => (
            <div
              key={m.label}
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--brand-radius-lg, 12px)',
                backgroundColor: 'var(--brand-surface, var(--dw-surface, #f8fafc))',
                border: '1px solid var(--border, rgba(0,0,0,0.08))',
              }}
            >
              <span
                style={{
                  flex: '0 0 auto',
                  minWidth: 92,
                  fontWeight: 700,
                  color: 'var(--brand-primary, var(--dw-primary, #2563eb))',
                  fontSize: 'var(--fs-sm, 0.95rem)',
                }}
              >
                {m.label}
              </span>
              <span
                style={{
                  color: 'var(--text, #374151)',
                  fontSize: 'var(--fs-sm, 0.95rem)',
                  whiteSpace: m.multiline ? 'pre-line' : 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {qrImageUrl ? (
          <div style={{ marginTop: '0.5rem', width: 180, maxWidth: '60%' }}>
            <ImageElement
              url={qrImageUrl}
              alt={`${title} QR`}
              props={props}
              elementKey="qrImageUrl"
              sizeCategory="card-grid"
              baseStyle={{ width: '100%', height: 'auto', borderRadius: 'var(--brand-radius-md, 8px)' }}
            />
          </div>
        ) : null}

        {note ? (
          <TextBodyElement
            text={note}
            props={props}
            elementKey="note"
            defaultTag="div"
            defaultSize="caption"
            html
            className="prose prose-sm mx-auto text-center"
          />
        ) : null}
      </div>
    </SectionShell>
  );
}
