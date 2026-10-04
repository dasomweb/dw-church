'use client';

/**
 * Lightweight contact-form block — submits to a configurable endpoint
 * (default `/api/v1/forms/contact`) and shows an inline success /
 * error state below the submit button. Native browser validation only;
 * deliberately no React Hook Form / Zod — we'd rather keep the block's
 * dependency surface zero so a tenant rendering on the storefront
 * doesn't pay a 30 KB form-lib tax for what is, ultimately, a name +
 * email + message.
 *
 * Fields are configurable via `fields[]` so an operator can add a
 * "phone" or "company" row without touching code. Each field:
 *   { name, label, type ('text' | 'email' | 'tel' | 'textarea'),
 *     required?: bool, placeholder?: string }
 *
 * The default field set covers the 90% B2B "contact us" form. The
 * agent can populate variant-specific shapes (e.g. quote-request adds
 * "estimated budget" and "timeline").
 *
 * Layout variants:
 *   stacked        — labels above inputs, full-width column. Default.
 *                    Reads as a clear vertical form on mobile and
 *                    desktop.
 *   side-by-side   — title + description on the left, form on the
 *                    right. B2B "request a consultation" pattern.
 *
 * Phase-2 element-composition refactor: title / description go through
 * HeadingElement / TextBodyElement; the submit button keeps its native
 * <button type="submit"> (ButtonElement only emits type="button" or
 * <a href>) but routes its style through mergeElementStyle so the
 * operator's elementStyles[submitLabel] tweak still applies. The form
 * shell (inputs / textarea / status states) stays JSX — those aren't
 * text elements.
 */

import { useState } from 'react';
import { HeadingElement, TextBodyElement } from '../elements';
import { SectionShell } from '../utilities/SectionShell';
import { mergeElementStyle } from '../utilities/element-styles';

// Storefront and API are on different origins in prod, so a relative endpoint
// (the default /api/v1/forms/contact) would POST to the web origin and 404.
// Resolve relative endpoints against the API base (inlined by Next at build).
const API_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || 'https://api.truelight.app';
function resolveEndpoint(endpoint: string): string {
  return /^https?:\/\//.test(endpoint) ? endpoint : `${API_BASE}${endpoint}`;
}

interface ContactFormBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea';
  required?: boolean;
  placeholder?: string;
}

// No DEFAULT_FIELDS — every label / placeholder / button copy must come
// from props (set by the AI agent at build time or by the operator in
// the inspector). The strict "no hardcoded default copy" rule applies to
// every layer; here that means an empty `fields` array renders an empty
// form (operator's cue to populate it), not a Korean stub form.

export function ContactFormBlock({ props, slug }: ContactFormBlockProps) {
  const title = (props.title as string) || '';
  const description = (props.description as string) || (props.subtitle as string) || '';
  const rawVariant = (props.variant as string) ?? '';
  const variant =
    rawVariant === 'side-by-side' ? 'side-by-side' : rawVariant === 'ruled' ? 'ruled' : 'stacked';
  const submitLabel = (props.submitLabel as string) || '';
  const submittingLabel = (props.submittingLabel as string) || '';
  const successMessage = (props.successMessage as string) || '';
  const fallbackErrorMessage = (props.errorMessage as string) || '';
  const fields = (Array.isArray(props.fields) ? (props.fields as FieldDef[]) : []);
  const endpoint = (props.endpoint as string) || '/api/v1/forms/contact';

  // Strict no-default-copy rule (feedback-no-hardcoded-defaults): if no
  // fields are configured, the block doesn't render. Previously fell back
  // to a hardcoded Korean DEFAULT_FIELDS array which leaked Korean labels
  // into English tenant sites. Operator now sees an inspector entry but
  // the live site stays clean until they (or the AI) configure fields.
  if (fields.length === 0) {
    return null;
  }

  // 2026-05-29: SectionShell + applyLayout 로 마이그레이션. 이전 hand-roll
  // `mx-auto max-w-6xl px-4 sm:px-6 bg-white` 는 운영자의 backgroundImage /
  // overlay / border / width / contentWidth 토글을 모두 무시했음. SectionShell
  // 이 그 전부를 통합 관리. stacked variant 의 'max-w-xl mx-auto' 좁은 폼은
  // 컬럼 자체 구조라 inner 에 유지.
  return (
    <SectionShell
      props={props}
      style={{ paddingBlock: 'var(--section-py-lg)' }}
      applyLayout
    >
      {variant === 'ruled' ? (
        // ruled — 좌측 작은 라벨 + 더블 괘선, 우측 납작한 폼. 에디토리얼 톤
        // 교회 서브페이지('연락처 남기기')용. 색/폰트는 테마 토큰을 따른다.
        <div
          style={{
            borderTop: '3px double var(--dw-text, #3a3129)',
            paddingTop: 28,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px 56px',
          }}
        >
          <div style={{ flex: '0 0 200px', minWidth: 0 }}>
            {title && (
              <TextBodyElement
                text={title}
                props={props}
                elementKey="title"
                defaultTag="p"
                defaultSize="caption"
                baseStyle={{
                  margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em',
                  color: 'var(--dw-secondary, #5e6044)',
                }}
              />
            )}
            {description && (
              <TextBodyElement
                text={description}
                props={props}
                elementKey="description"
                defaultTag="p"
                defaultSize="caption"
                baseStyle={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.7, color: 'var(--brand-muted, #6f6255)' }}
              />
            )}
          </div>
          <div style={{ flex: '1 1 420px', minWidth: 0, maxWidth: 620 }}>
            <FormBody
              fields={fields}
              endpoint={endpoint}
              submitLabel={submitLabel}
              submittingLabel={submittingLabel}
              successMessage={successMessage}
              fallbackErrorMessage={fallbackErrorMessage}
              tenantSlug={slug}
              source={props}
              ruled
            />
          </div>
        </div>
      ) : variant === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
          <div>
            <Header title={title} description={description} source={props} />
          </div>
          <FormBody
            fields={fields}
            endpoint={endpoint}
            submitLabel={submitLabel}
            submittingLabel={submittingLabel}
            successMessage={successMessage}
            fallbackErrorMessage={fallbackErrorMessage}
            tenantSlug={slug}
            source={props}
          />
        </div>
      ) : (
        <>
          <Header title={title} description={description} source={props} centered />
          <FormBody
            fields={fields}
            endpoint={endpoint}
            submitLabel={submitLabel}
            submittingLabel={submittingLabel}
            successMessage={successMessage}
            fallbackErrorMessage={fallbackErrorMessage}
            tenantSlug={slug}
            source={props}
          />
        </>
      )}
    </SectionShell>
  );
}

/* ─── header ───────────────────────────────────────────────── */

function Header({
  title,
  description,
  source,
  centered,
}: {
  title: string;
  description: string;
  source: Record<string, unknown>;
  centered?: boolean;
}) {
  return (
    <header className={`mb-8 ${centered ? 'text-center' : ''}`}>
      <HeadingElement
        text={title}
        props={source}
        elementKey="title"
        defaultTag="h2"
        defaultSize="h2"
      />
      <TextBodyElement
        text={description}
        props={source}
        elementKey="description"
        defaultTag="p"
        defaultSize="body"
      />
    </header>
  );
}

/* ─── form body ────────────────────────────────────────────── */

function FormBody({
  fields,
  endpoint,
  submitLabel,
  submittingLabel,
  successMessage,
  fallbackErrorMessage,
  tenantSlug,
  source,
  ruled,
}: {
  fields: FieldDef[];
  endpoint: string;
  submitLabel: string;
  submittingLabel: string;
  successMessage: string;
  fallbackErrorMessage: string;
  tenantSlug?: string;
  source: Record<string, unknown>;
  /** ruled variant — 테마 토큰 기반 납작한 입력(테일윈드 gray 계열 대신). */
  ruled?: boolean;
}) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    for (const f of fields) {
      const v = formData.get(f.name);
      if (typeof v === 'string') payload[f.name] = v;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;
      const res = await fetch(resolveEndpoint(endpoint), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      setStatus('success');
      e.currentTarget.reset();
    } catch (err) {
      setStatus('error');
      // Strict no-default-copy: operator's fallbackErrorMessage (set via
      // inspector or AI agent) is the only fallback. Empty → only the
      // server's actual error text shows; no hardcoded Korean stub.
      setError(err instanceof Error ? err.message : (fallbackErrorMessage || ''));
    }
  };

  if (status === 'success') {
    if (ruled) {
      return (
        <div style={{ border: '1px solid var(--border, #e2d8cb)', background: 'var(--dw-surface, #fffdf9)', padding: '26px 20px', textAlign: 'center' }}>
          <TextBodyElement
            text={successMessage}
            props={source}
            elementKey="successMessage"
            defaultTag="p"
            defaultSize="body"
            baseStyle={{ margin: 0, fontSize: 16, color: 'var(--dw-text, #3a3129)' }}
          />
        </div>
      );
    }
    return (
      <div
        className="rounded-lg bg-green-50 border border-green-200 px-6 py-8 text-center"
      >
        <div className="text-3xl mb-2" aria-hidden="true">✓</div>
        <TextBodyElement
          text={successMessage}
          props={source}
          elementKey="successMessage"
          defaultTag="p"
          defaultSize="body"
          className="text-green-800 font-medium"
        />
      </div>
    );
  }

  if (ruled) {
    // 짧은 입력은 2열 auto-fit, textarea 는 아래 전체 폭 — 시안의 '연락처 남기기' 구성.
    const short = fields.filter((f) => f.type !== 'textarea');
    const long = fields.filter((f) => f.type === 'textarea');
    const inputStyle: React.CSSProperties = {
      width: '100%', background: 'var(--dw-background, #fffdf9)',
      border: '1px solid var(--border, #e2d8cb)', borderRadius: 2,
      padding: '13px 15px', fontSize: 16, color: 'var(--dw-text, #3a3129)',
      fontFamily: 'inherit', outline: 'none',
    };
    const labelStyle: React.CSSProperties = { display: 'block', margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--brand-muted, #6f6255)' };
    const field = (f: FieldDef) => (
      <div key={f.name}>
        <label htmlFor={`contact-${f.name}`} style={labelStyle}>
          {f.label}
          {f.required && <span style={{ color: 'var(--dw-primary, #7b7d5c)', marginLeft: 2 }} aria-hidden="true">*</span>}
        </label>
        {f.type === 'textarea' ? (
          <textarea id={`contact-${f.name}`} name={f.name} required={f.required} placeholder={f.placeholder}
            rows={3} disabled={status === 'submitting'} style={{ ...inputStyle, minHeight: 84, resize: 'vertical' }} />
        ) : (
          <input id={`contact-${f.name}`} type={f.type} name={f.name} required={f.required}
            placeholder={f.placeholder} disabled={status === 'submitting'} style={inputStyle} />
        )}
      </div>
    );
    return (
      <form onSubmit={handleSubmit} noValidate>
        {short.length > 0 && (
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
            {short.map(field)}
          </div>
        )}
        {long.map((f) => <div key={f.name} style={{ marginTop: 14 }}>{field(f)}</div>)}
        <button
          data-element="submitLabel"
          data-element-type="button"
          type="submit"
          disabled={status === 'submitting'}
          style={mergeElementStyle(
            {
              marginTop: 20, background: 'var(--dw-text, #3a3129)', color: '#fff', border: 0,
              padding: '14px 32px', borderRadius: 2, fontSize: 15, fontWeight: 600,
              fontFamily: 'inherit', cursor: 'pointer',
            },
            source,
            'submitLabel',
          )}
        >
          {status === 'submitting' ? (submittingLabel || submitLabel) : submitLabel}
        </button>
        {status === 'error' && error && (
          <p style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--dw-primary, #7b7d5c)' }}>{error}</p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {fields.map((f) => (
        <div key={f.name}>
          <label
            htmlFor={`contact-${f.name}`}
            className="block text-sm font-medium text-gray-800 mb-1.5"
          >
            {f.label}
            {f.required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
          </label>
          {f.type === 'textarea' ? (
            <textarea
              id={`contact-${f.name}`}
              name={f.name}
              required={f.required}
              placeholder={f.placeholder}
              rows={5}
              disabled={status === 'submitting'}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:border-[var(--accent,var(--dw-primary))] focus:ring-2 focus:ring-[var(--accent,var(--dw-primary))] focus:ring-opacity-20 outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed resize-y"
            />
          ) : (
            <input
              id={`contact-${f.name}`}
              type={f.type}
              name={f.name}
              required={f.required}
              placeholder={f.placeholder}
              disabled={status === 'submitting'}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:border-[var(--accent,var(--dw-primary))] focus:ring-2 focus:ring-[var(--accent,var(--dw-primary))] focus:ring-opacity-20 outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          )}
        </div>
      ))}
      <button
        data-element="submitLabel"
        data-element-type="button"
        type="submit"
        disabled={status === 'submitting'}
        className="w-full b2b-cta-primary rounded-lg px-6 py-3 font-semibold transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        style={mergeElementStyle(
          {
            fontSize: 'var(--brand-button, var(--fs-base))',
            fontWeight: 'var(--brand-button-weight, 600)',
            lineHeight: 'var(--brand-button-line-height, 1)',
            letterSpacing: 'var(--brand-button-letter-spacing, 0)',
            fontFamily: 'var(--brand-font-body)',
          },
          source,
          'submitLabel',
        )}
      >
        {status === 'submitting' ? (submittingLabel || submitLabel) : submitLabel}
      </button>
      {status === 'error' && error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}
    </form>
  );
}
