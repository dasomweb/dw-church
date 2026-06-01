'use client';

import { useState } from 'react';
import { HeadingElement, TextBodyElement, EyebrowElement } from '../elements';
import { mergeElementStyle } from '../utilities/element-styles';

/**
 * Inline newsletter signup. Per web-block-patterns-reference §2.13:
 *  - Single email field + visible button
 *  - <label class="sr-only"> for screen-readers (placeholder = visual label)
 *  - autocomplete="email", type="email"
 *  - Font-size 16px+ to dodge iOS auto-zoom
 *  - Optimistic success message via role="status"
 *  - Stub submit handler — POSTs to props.submitEndpoint or
 *    /api/v1/subscribe. Server-side endpoint can land later; this block
 *    is render-only for now and no-ops if the endpoint isn't wired yet.
 *
 * Phase-2 element-composition refactor: title / subtitle / success /
 * privacy text route through HeadingElement / TextBodyElement so the
 * operator's elementStyles / elementTags / brand-token CSS variables
 * own typography decisions. The <input> and <button type="submit">
 * stay native — ButtonElement only emits type="button" / <a href>,
 * so the submit keeps mergeElementStyle by hand. The input field is
 * not a text element so it keeps its JSX too.
 */
interface SubscribeFormBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function SubscribeFormBlock({ props }: SubscribeFormBlockProps) {
  // No hard-coded copy defaults — operator / AI agent must supply props.
  // Missing strings render as empty (the block hides its title/subtitle
  // when empty rather than leaking English placeholder copy across all
  // tenants). See feedback-no-hardcoded-defaults.
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const placeholder = (props.placeholder as string) ?? '';
  const buttonText = (props.buttonText as string) ?? '';
  const successMessage = (props.successMessage as string) ?? '';
  const submitEndpoint = (props.submitEndpoint as string) ?? '/api/v1/subscribe';
  const privacyText = (props.privacyText as string) ?? '';
  const bgMode = ((props.bgMode as string) ?? 'subtle') as 'none' | 'subtle' | 'accent';

  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'ok' | 'err'>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setState('submitting');
    setErrMsg('');
    try {
      const res = await fetch(submitEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState('ok');
      setEmail('');
    } catch (err) {
      setState('err');
      setErrMsg(err instanceof Error ? err.message : 'Subscription failed');
    }
  }

  const bgClass =
    bgMode === 'accent'
      ? 'bg-[var(--accent)] text-[var(--text-on-accent)]'
      : bgMode === 'subtle'
        ? 'bg-[var(--bg-subtle)]'
        : '';

  return (
    <section className={bgClass} style={{ paddingBlock: 'var(--section-py-md)' }}>
      {/* Section envelope keeps its outer max-w-2xl (section frame, not
       * a content cap). The inner per-element text width is operator-
       * controlled via elementStyles.{key}.maxWidth. */}
      <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
        {eyebrow && (
          <EyebrowElement
            text={eyebrow}
            props={props}
            elementKey="eyebrow"
            className="mb-3"
          />
        )}
        <HeadingElement
          text={title}
          props={props}
          elementKey="title"
          defaultTag="h2"
          defaultSize="h2"
        />
        <HeadingElement
          text={subtitle}
          props={props}
          elementKey="subtitle"
          defaultTag="h5"
          defaultSize="h3"
        />

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
          noValidate
        >
          <label htmlFor="subscribe-email" className="sr-only">Email address</label>
          <input
            data-element="placeholder"
            id="subscribe-email"
            type="email"
            name="email"
            placeholder={placeholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={state === 'submitting'}
            className="flex-1 rounded-lg border bg-white px-4 outline-none disabled:opacity-50"
            style={mergeElementStyle(
              {
                borderColor: 'var(--border-strong)',
                height: 48,
                fontSize: 16,
                color: 'var(--text-primary)',
              },
              props,
              'placeholder',
            )}
          />
          <button
            data-element="buttonText"
            data-element-type="button"
            type="submit"
            disabled={state === 'submitting'}
            className="rounded-lg font-semibold px-6 disabled:opacity-50"
            style={mergeElementStyle(
              {
                height: 48,
                fontSize: 'var(--brand-button, var(--fs-base))',
                fontWeight: 'var(--brand-button-weight, 600)',
                lineHeight: 'var(--brand-button-line-height, 1)',
                letterSpacing: 'var(--brand-button-letter-spacing, 0)',
                fontFamily: 'var(--brand-font-body)',
                background: bgMode === 'accent' ? 'var(--text-on-accent)' : 'var(--brand-primary)',
                color: bgMode === 'accent' ? 'var(--brand-primary)' : 'var(--brand-primary-fg, #fff)',
              },
              props,
              'buttonText',
            )}
          >
            {state === 'submitting' ? '...' : buttonText}
          </button>
        </form>

        <p className="mt-3 min-h-[1.5em]" role="status" aria-live="polite" style={{ fontSize: 'var(--fs-sm)' }}>
          {state === 'ok' && (
            <TextBodyElement
              text={successMessage}
              props={props}
              elementKey="successMessage"
              defaultTag="span"
              defaultSize="caption"
              baseStyle={{ color: 'var(--success)' }}
            />
          )}
          {state === 'err' && <span style={{ color: 'var(--danger)' }}>{errMsg || (props.errorMessage as string) || ''}</span>}
        </p>

        <TextBodyElement
          text={privacyText}
          props={props}
          elementKey="privacyText"
          defaultTag="p"
          defaultSize="caption"
          className="mt-2"
          baseStyle={{ color: bgMode === 'accent' ? 'inherit' : 'var(--text-muted)' }}
        />
      </div>
    </section>
  );
}
