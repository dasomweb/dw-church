import React from 'react';
import Link from 'next/link';

// TenantFooter — self-contained storefront footer (React Server Component).
// Renders one of 9 layout variants faithful to Claude Design "Footer 모음 — 시안 푸터 9종".
// Colors come strictly from props (inline styles): background / text / heading.
// Internal links use next/link; social/external links use plain <a target="_blank">.
// No "use client", no hooks — safe as an RSC.

export type FooterVariant =
  | 'columns'
  | 'history'
  | 'minimal'
  | 'navy'
  | 'centered'
  | 'compact'
  | 'bilingual'
  | 'large'
  | 'app';

export interface FooterNavChild {
  id: string;
  label: string;
  href: string;
}
export interface FooterNavCol {
  id: string;
  label: string;
  children: FooterNavChild[];
}
export interface TenantFooterProps {
  variant: FooterVariant;
  background: string;
  text: string;
  heading: string; // hex colors
  showLogo: boolean;
  showText: boolean;
  brandText: string;
  logo: string;
  churchName: string;
  address: string;
  phone: string;
  email: string;
  directionsLabel: string;
  socialLabel: string;
  tagline: string;
  showNav: boolean;
  navCols: FooterNavCol[]; // resolved nav groups (label + children with href)
  social: { kakao?: string; instagram?: string; youtube?: string; facebook?: string };
  copyright: string;
  historyHref: string; // used by the 'history' variant's "교회 연혁 보기 →" link
}

/* ─────────────────────────── Social icons (verbatim) ─────────────────────────── */

function SocialButton({
  href,
  bg,
  label,
  children,
}: {
  href: string;
  bg: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-opacity hover:opacity-85"
      style={{ backgroundColor: bg }}
    >
      {children}
    </a>
  );
}
function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#3A1D1D" aria-hidden="true">
      <path d="M12 3C6.48 3 2 6.58 2 10.99c0 2.84 1.93 5.33 4.84 6.74-.16.55-.83 2.87-.86 3.05 0 0-.02.15.08.21.1.06.22.01.22.01.29-.04 3.37-2.2 3.96-2.61.55.08 1.12.12 1.76.12 5.52 0 10-3.58 10-7.52C22 6.58 17.52 3 12 3z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none" />
    </svg>
  );
}
function YoutubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3-5.2 3z" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
    </svg>
  );
}

/* ─────────────────────────── Shared helpers ─────────────────────────── */

// Lays out the (up to) 4 social buttons; each renders only when its url is set.
function SocialRow({
  social,
  align = 'left',
}: {
  social: TenantFooterProps['social'];
  align?: 'left' | 'center';
}) {
  const btns: React.ReactNode[] = [];
  if (social.kakao)
    btns.push(
      <SocialButton key="kakao" href={social.kakao} bg="#FEE500" label="카카오톡">
        <KakaoIcon />
      </SocialButton>,
    );
  if (social.instagram)
    btns.push(
      <SocialButton key="instagram" href={social.instagram} bg="#E1306C" label="인스타그램">
        <InstagramIcon />
      </SocialButton>,
    );
  if (social.youtube)
    btns.push(
      <SocialButton key="youtube" href={social.youtube} bg="#FF0000" label="유튜브">
        <YoutubeIcon />
      </SocialButton>,
    );
  if (social.facebook)
    btns.push(
      <SocialButton key="facebook" href={social.facebook} bg="#1877F2" label="페이스북">
        <FacebookIcon />
      </SocialButton>,
    );
  if (btns.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${align === 'center' ? 'justify-center' : ''}`}>{btns}</div>
  );
}

// Brand block: logo image, or brand text. `size` = logo height in px; text scales from it.
function Brand({
  showLogo,
  showText,
  logo,
  brandText,
  churchName,
  heading,
  size,
  className,
}: {
  showLogo: boolean;
  showText: boolean;
  logo: string;
  brandText: string;
  churchName: string;
  heading: string;
  size: number;
  className?: string;
}) {
  if (showLogo && !showText && logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={churchName}
        style={{ height: size }}
        className={`w-auto object-contain ${className ?? ''}`}
      />
    );
  }
  if (showLogo) {
    return (
      <span
        style={{ color: heading, fontSize: Math.round(size * 0.4) }}
        className={`font-bold font-heading ${className ?? ''}`}
      >
        {brandText}
      </span>
    );
  }
  return null;
}

// Nav sitemap columns. `cols` is pre-sliced by the caller; `className` sizes the container.
function NavColumns({
  cols,
  text,
  heading,
  className,
}: {
  cols: FooterNavCol[];
  text: string;
  heading: string;
  className?: string;
}) {
  if (!cols || cols.length === 0) return null;
  return (
    <nav aria-label="풋터 메뉴" className={className}>
      {cols.map((col) => (
        <div key={col.id}>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: heading }}>
            {col.label}
          </h3>
          <ul className="space-y-2 text-sm">
            {col.children.map((child) => (
              <li key={child.id}>
                <Link
                  href={child.href}
                  className="opacity-80 transition-opacity hover:opacity-100"
                  style={{ color: text }}
                >
                  {child.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// Contact lines — address / phone / email, each on its own line, empties skipped.
function ContactLines({
  address,
  phone,
  email,
  text,
  align = 'left',
}: {
  address?: string;
  phone?: string;
  email?: string;
  text: string;
  align?: 'left' | 'center';
}) {
  const lines = [address, phone, email].filter(Boolean) as string[];
  if (lines.length === 0) return null;
  return (
    <div
      className={`space-y-1 text-sm ${align === 'center' ? 'text-center' : ''}`}
      style={{ color: text }}
    >
      {lines.map((line, i) => (
        <p key={i} className="opacity-80">
          {line}
        </p>
      ))}
    </div>
  );
}

// Bottom copyright bar shared by most variants.
function CopyrightBar({
  text,
  copyright,
  py = 'py-5',
}: {
  text: string;
  copyright: string;
  py?: string;
}) {
  return (
    <div
      style={{ borderTop: `1px solid ${text}22` }}
      className={`px-4 ${py} text-center text-xs`}
    >
      {copyright}
    </div>
  );
}

// Join non-empty strings with " · ".
function dot(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(' · ');
}

/* Shared body used by the 'columns' and 'history' variants:
   LEFT = Brand + Directions + Social, RIGHT = nav sitemap. */
function ColumnsBody(props: TenantFooterProps) {
  const {
    text,
    heading,
    showLogo,
    showText,
    logo,
    brandText,
    churchName,
    address,
    phone,
    email,
    directionsLabel,
    socialLabel,
    showNav,
    navCols,
    social,
  } = props;
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
        {/* LEFT group: brand + directions + social */}
        <div className="grid gap-8 sm:grid-cols-3 lg:flex lg:gap-12">
          <div>
            <Brand
              showLogo={showLogo}
              showText={showText}
              logo={logo}
              brandText={brandText}
              churchName={churchName}
              heading={heading}
              size={56}
            />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: heading }}>
              {directionsLabel}
            </h3>
            <ContactLines address={address} phone={phone} email={email} text={text} />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: heading }}>
              {socialLabel}
            </h3>
            <SocialRow social={social} />
          </div>
        </div>
        {/* RIGHT: nav sitemap */}
        {showNav && navCols.length > 0 && (
          <NavColumns
            cols={navCols}
            text={text}
            heading={heading}
            className="grid grid-cols-2 gap-8 sm:flex sm:gap-12 lg:gap-16"
          />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Main component ─────────────────────────── */

export function TenantFooter(props: TenantFooterProps) {
  const {
    background,
    text,
    heading,
    showLogo,
    showText,
    logo,
    brandText,
    churchName,
    address,
    phone,
    email,
    socialLabel,
    tagline,
    showNav,
    navCols,
    social,
    copyright,
    historyHref,
  } = props;

  // Default any unknown variant to 'columns'.
  const known: FooterVariant[] = [
    'columns',
    'history',
    'minimal',
    'navy',
    'centered',
    'compact',
    'bilingual',
    'large',
    'app',
  ];
  const variant: FooterVariant = known.includes(props.variant) ? props.variant : 'columns';

  const rootStyle: React.CSSProperties = { backgroundColor: background, color: text };

  /* ── 2. history — 상단 연혁 한 줄 + 3열 ── */
  if (variant === 'history') {
    return (
      <footer role="contentinfo" style={rootStyle}>
        <div
          style={{ borderBottom: `1px solid ${text}22` }}
          className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          {tagline && <p className="text-sm opacity-80">{tagline}</p>}
          <Link
            href={historyHref}
            className="text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ color: heading }}
          >
            교회 연혁 보기 →
          </Link>
        </div>
        <ColumnsBody {...props} />
        <CopyrightBar text={text} copyright={copyright} />
      </footer>
    );
  }

  /* ── 3. minimal — 얇은 한 줄 바 ── */
  if (variant === 'minimal') {
    const contact = dot(address, phone);
    return (
      <footer role="contentinfo" style={rootStyle}>
        {tagline && (
          <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm opacity-80 sm:px-6">
            {tagline}
          </div>
        )}
        <div
          style={{ borderTop: `1px solid ${text}22` }}
          className="px-4 py-6 text-center text-xs opacity-80"
        >
          <span>{copyright}</span>
          {contact && <span className="ml-2">· {contact}</span>}
        </div>
      </footer>
    );
  }

  /* ── 4. navy — 딥 네이비 컴팩트 ── */
  if (variant === 'navy') {
    return (
      <footer role="contentinfo" style={rootStyle}>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
            <div>
              <Brand
                showLogo={showLogo}
                showText={showText}
                logo={logo}
                brandText={brandText}
                churchName={churchName}
                heading={heading}
                size={44}
              />
              <div className="mt-4">
                <ContactLines address={address} phone={phone} text={text} />
              </div>
              <div className="mt-4">
                <SocialRow social={social} />
              </div>
            </div>
            {showNav && navCols.length > 0 && (
              <NavColumns
                cols={navCols.slice(0, 2)}
                text={text}
                heading={heading}
                className="flex gap-10 lg:gap-14"
              />
            )}
          </div>
        </div>
        <CopyrightBar text={text} copyright={copyright} />
      </footer>
    );
  }

  /* ── 5. centered — 중앙 정렬 ── */
  if (variant === 'centered') {
    const line1 = dot(address, phone);
    return (
      <footer role="contentinfo" style={rootStyle}>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-12 text-center sm:px-6">
          <Brand
            showLogo={showLogo}
            showText={showText}
            logo={logo}
            brandText={brandText}
            churchName={churchName}
            heading={heading}
            size={52}
          />
          <div className="text-sm" style={{ color: text }}>
            {line1 && <p className="opacity-80">{line1}</p>}
            {email && <p className="opacity-80">{email}</p>}
          </div>
          {tagline && <p className="text-xs opacity-70">{tagline}</p>}
          <SocialRow social={social} align="center" />
        </div>
        <CopyrightBar text={text} copyright={copyright} />
      </footer>
    );
  }

  /* ── 6. compact — 소형·개척 2단 ── */
  if (variant === 'compact') {
    return (
      <footer role="contentinfo" style={rootStyle}>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Brand
                showLogo={showLogo}
                showText={showText}
                logo={logo}
                brandText={brandText}
                churchName={churchName}
                heading={heading}
                size={44}
              />
              {tagline && <p className="mt-3 text-sm opacity-70">{tagline}</p>}
              <div className="mt-3">
                <ContactLines address={address} phone={phone} text={text} />
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold" style={{ color: heading }}>
                {socialLabel}
              </h3>
              <SocialRow social={social} />
              {email && (
                <p className="mt-3 text-xs opacity-70" style={{ color: text }}>
                  이메일 소식지 · {email}
                </p>
              )}
            </div>
          </div>
        </div>
        <CopyrightBar text={text} copyright={copyright} />
      </footer>
    );
  }

  /* ── 7. bilingual — 한·영 병기 + 2열 ── */
  if (variant === 'bilingual') {
    const showSecondary = Boolean(churchName) && brandText !== churchName;
    return (
      <footer role="contentinfo" style={rootStyle}>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
            <div>
              <Brand
                showLogo={showLogo}
                showText={showText}
                logo={logo}
                brandText={brandText}
                churchName={churchName}
                heading={heading}
                size={52}
              />
              {showSecondary && (
                <p className="mt-2 text-sm opacity-70" style={{ color: text }}>
                  {churchName}
                </p>
              )}
              <div className="mt-4">
                <ContactLines address={address} phone={phone} email={email} text={text} />
              </div>
            </div>
            {showNav && navCols.length > 0 && (
              <NavColumns
                cols={navCols.slice(0, 2)}
                text={text}
                heading={heading}
                className="flex gap-12 lg:gap-16"
              />
            )}
          </div>
        </div>
        <CopyrightBar text={text} copyright={copyright} />
      </footer>
    );
  }

  /* ── 8. large — 큰 글씨 한 단 ── */
  if (variant === 'large') {
    const contact = dot(address, phone, email);
    return (
      <footer role="contentinfo" style={rootStyle}>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6">
          {showLogo && !showText && logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={churchName} style={{ height: 64 }} className="w-auto object-contain" />
          ) : (
            <span
              className="font-heading text-2xl font-bold sm:text-3xl"
              style={{ color: heading }}
            >
              {brandText || churchName}
            </span>
          )}
          {tagline && <p className="text-sm opacity-70">{tagline}</p>}
          {contact && (
            <p className="text-sm opacity-80" style={{ color: text }}>
              {contact}
            </p>
          )}
          <div className="mt-2">
            <SocialRow social={social} align="center" />
          </div>
        </div>
        <CopyrightBar text={text} copyright={copyright} />
      </footer>
    );
  }

  /* ── 9. app — 모바일·앱형 중앙 정렬 ── */
  if (variant === 'app') {
    return (
      <footer role="contentinfo" style={rootStyle}>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-8 text-center sm:px-6">
          <Brand
            showLogo={showLogo}
            showText={showText}
            logo={logo}
            brandText={brandText}
            churchName={churchName}
            heading={heading}
            size={40}
          />
          {address && (
            <p className="text-sm opacity-80" style={{ color: text }}>
              {address}
            </p>
          )}
          {phone && (
            <p className="text-sm opacity-80" style={{ color: text }}>
              {phone}
            </p>
          )}
          {tagline && <p className="text-xs opacity-70">{tagline}</p>}
          <div className="mt-1">
            <SocialRow social={social} align="center" />
          </div>
        </div>
        <CopyrightBar text={text} copyright={copyright} py="py-4" />
      </footer>
    );
  }

  /* ── 1. columns — 3열 사이트맵 + 로고 블록 (default) ── */
  return (
    <footer role="contentinfo" style={rootStyle}>
      {tagline && (
        <div
          style={{ borderBottom: `1px solid ${text}22` }}
          className="mx-auto max-w-7xl px-4 py-4 text-sm opacity-80 sm:px-6"
        >
          {tagline}
        </div>
      )}
      <ColumnsBody {...props} />
      <CopyrightBar text={text} copyright={copyright} />
    </footer>
  );
}
