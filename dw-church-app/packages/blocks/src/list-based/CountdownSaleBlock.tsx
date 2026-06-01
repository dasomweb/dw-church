'use client';

/**
 * Countdown sale — a promotional banner with a live countdown to a
 * target datetime (`endAt`, ISO string). Reuses the StatsCounter
 * client-timer pattern: the ticking digits only start after mount so
 * server and first client render match (no hydration mismatch — we
 * render a static "--" until the effect sets real values). When the
 * deadline passes the counter is replaced by `expiredText`.
 *
 * Nothing is hardcoded: title / button / expired copy default to
 * empty and are operator-supplied. Colors come from theme tokens.
 *
 * Phase-2 element-composition refactor: title / subtitle / expiredText
 * / buttonText delegated to HeadingElement / TextBodyElement /
 * ButtonElement modules. The countdown timer / interval logic + cell
 * grid stay inline (those are this block's interactive identity, not
 * generic typography).
 */

import { useEffect, useState } from 'react';
import { HeadingElement, TextBodyElement, ButtonElement } from '../elements';
import { sectionBgStyle, isDarkSection } from '../utilities/section-bg';

interface CountdownSaleBlockProps {
  props: Record<string, unknown>;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function diff(target: number): Remaining | null {
  const ms = target - Date.now();
  if (Number.isNaN(target) || ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function CountdownSaleBlock({ props }: CountdownSaleBlockProps) {
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || '';
  const endAt = (props.endAt as string) || '';
  const buttonText = (props.buttonText as string) || '';
  const buttonUrl = (props.buttonUrl as string) || '';
  const expiredText = (props.expiredText as string) || '';
  const bgMode = (props.bgMode as string) ?? 'accent';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);
  const onDark = isDarkSection(bgMode) || bgMode === 'accent';

  const target = endAt ? new Date(endAt).getTime() : NaN;
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!endAt) return;
    const update = () => setRemaining(diff(target));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [endAt, target]);

  const expired = mounted && endAt !== '' && remaining === null;

  const cells: Array<{ label: string; value: number | null }> = [
    { label: 'Days', value: remaining?.days ?? null },
    { label: 'Hours', value: remaining?.hours ?? null },
    { label: 'Minutes', value: remaining?.minutes ?? null },
    { label: 'Seconds', value: remaining?.seconds ?? null },
  ];

  return (
    <section
      className={sectionBg.className}
      style={{ paddingBlock: 'var(--section-py-md, 4rem)', ...sectionBg.style }}
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
        <HeadingElement
          text={title}
          props={props}
          elementKey="title"
          defaultTag="h2"
          defaultSize="h2"
        />
        <TextBodyElement
          text={subtitle}
          props={props}
          elementKey="subtitle"
          defaultTag="p"
          defaultSize="h3"
          className="mt-3"
        />

        {expired ? (
          <TextBodyElement
            text={expiredText}
            props={props}
            elementKey="expiredText"
            defaultTag="p"
            defaultSize="h5"
            className="mt-8"
          />
        ) : (
          <div className="mt-8 flex justify-center gap-3 sm:gap-5">
            {cells.map((c) => (
              <div
                key={c.label}
                className="min-w-[64px] sm:min-w-[84px] rounded-xl bg-white/10 backdrop-blur px-2 py-3"
                style={onDark ? undefined : { background: 'var(--bg-subtle,#f3f4f6)' }}
              >
                <div
                  className="font-bold tabular-nums"
                  style={{ fontSize: 'var(--fs-h1, 2.5rem)', lineHeight: 1 }}
                >
                  {c.value === null ? '--' : String(c.value).padStart(2, '0')}
                </div>
                <div className="mt-1" style={{ fontSize: 'var(--fs-xs)', opacity: 0.75 }}>
                  {c.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {!expired && buttonText && (
          <div className="mt-8">
            <ButtonElement
              text={buttonText}
              href={buttonUrl}
              props={props}
              elementKey="buttonText"
              defaultVariant="filled"
            />
          </div>
        )}
      </div>
    </section>
  );
}
