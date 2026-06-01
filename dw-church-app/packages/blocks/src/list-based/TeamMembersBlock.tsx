import { HeadingElement, TextBodyElement, ImageElement, EyebrowElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';

/**
 * Team / People grid — avatar + name + role + social links.
 * Per web-block-patterns-reference §2.10.
 *
 * Reuses the existing staff_grid prop schema for tenants migrating
 * from dw-church naming. The block_type alias is set in
 * apps/server/src/modules/pages/schema.ts.
 *
 * Phase-2 element-composition refactor: header (title / subtitle),
 * per-member name / role / bio + photo delegated to reusable element
 * modules. Social icons stay inline because the icon glyphs themselves
 * are intrinsic to the social-link variant (not generic CTA buttons).
 */
interface TeamMembersBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

interface TeamItem {
  name?: string;
  role?: string;
  // photoUrl is the storefront-native name. The editor historically
  // wrote `imageUrl`, so accept both. Same back-compat story for `bio`
  // vs `description`. Without this, members rendered without photos
  // and without bios when content came from the editor.
  photoUrl?: string;
  imageUrl?: string;
  bio?: string;
  description?: string;
  social?: { linkedin?: string; twitter?: string; email?: string; instagram?: string };
}

export function TeamMembersBlock({ props }: TeamMembersBlockProps) {
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const columns = ((props.columns as string) ?? '3') as '2' | '3' | '4';
  // Normalise legacy editor field names so the rest of the component
  // can read photoUrl / bio uniformly. Drop blank rows entirely.
  const rawItems = (Array.isArray(props.items) ? props.items : []) as TeamItem[];
  const items = rawItems
    .map((it) => ({
      ...it,
      photoUrl: it.photoUrl ?? it.imageUrl ?? '',
      bio: it.bio ?? it.description ?? '',
    }))
    .filter((it) => (it.name ?? '').length > 0 || (it.role ?? '').length > 0);
  const photoStyle = ((props.photoStyle as string) ?? 'circle') as 'square' | 'circle';
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);

  if (items.length === 0) return null;

  const colsClass =
    columns === '4'
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : columns === '2'
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-2 lg:grid-cols-3';

  const photoRadius = photoStyle === 'circle' ? '9999px' : 'var(--r-md)';

  return (
    <SectionShell
      props={props}
      className={sectionBg.className}
      style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
    >
      <div>
        {(eyebrow || title || subtitle) && (
          <header className="mb-8 sm:mb-12 text-center">
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
          </header>
        )}

        <ul className={`grid grid-cols-1 ${colsClass} gap-6 sm:gap-8 list-none p-0`}>
          {items.map((m, i) => (
            <li key={i} className="text-center">
              {m.photoUrl ? (
                <div
                  className="relative mx-auto overflow-hidden bg-[var(--bg-muted)]"
                  style={{ width: 160, height: 160, borderRadius: photoRadius }}
                >
                  <ImageElement
                    url={m.photoUrl}
                    alt={m.name ?? ''}
                    props={props}
                    elementKey={`items[${i}].photoUrl`}
                    sizeCategory="avatar"
                    fillParent
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="mx-auto bg-[var(--bg-muted)] flex items-center justify-center"
                  style={{ width: 160, height: 160, borderRadius: photoRadius }}
                  aria-hidden="true"
                >
                  <span style={{ fontSize: 'var(--brand-h2, var(--fs-h2))', color: 'var(--text-muted)' }}>
                    {m.name?.[0] ?? '?'}
                  </span>
                </div>
              )}
              <HeadingElement
                text={m.name ?? ''}
                props={props}
                elementKey={`items[${i}].name`}
                defaultTag="h3"
                defaultSize="h5"
                className="mt-4"
              />
              <TextBodyElement
                text={m.role ?? ''}
                props={props}
                elementKey={`items[${i}].role`}
                defaultTag="p"
                defaultSize="caption"
              />
              <TextBodyElement
                text={m.bio ?? ''}
                props={props}
                elementKey={`items[${i}].bio`}
                defaultTag="p"
                defaultSize="caption"
                className="mt-2"
              />
              {m.social && (
                <ul className="mt-3 flex justify-center gap-3 list-none p-0">
                  {m.social.linkedin && (
                    <li>
                      <a href={m.social.linkedin} aria-label={`${m.name} LinkedIn`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
                        <SocialIcon name="linkedin" />
                      </a>
                    </li>
                  )}
                  {m.social.twitter && (
                    <li>
                      <a href={m.social.twitter} aria-label={`${m.name} X`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
                        <SocialIcon name="twitter" />
                      </a>
                    </li>
                  )}
                  {m.social.email && (
                    <li>
                      <a href={`mailto:${m.social.email}`} aria-label={`Email ${m.name}`} style={{ color: 'var(--text-muted)' }}>
                        <SocialIcon name="email" />
                      </a>
                    </li>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}

function SocialIcon({ name }: { name: 'linkedin' | 'twitter' | 'email' }) {
  if (name === 'linkedin') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 0H5C2.2 0 0 2.2 0 5v14c0 2.8 2.2 5 5 5h14c2.8 0 5-2.2 5-5V5c0-2.8-2.2-5-5-5zM8 19H5V8h3v11zM6.5 6.7C5.5 6.7 4.7 5.9 4.7 5s.8-1.7 1.8-1.7c1 0 1.7.8 1.7 1.7s-.7 1.7-1.7 1.7zM20 19h-3v-5.6c0-1.4-.5-2.4-1.7-2.4-.9 0-1.5.6-1.7 1.2-.1.2-.1.5-.1.8V19h-3V8h3v1.3c.4-.6 1.1-1.5 2.7-1.5 2 0 3.5 1.3 3.5 4V19z" />
      </svg>
    );
  }
  if (name === 'twitter') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}
