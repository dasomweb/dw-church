import { getChurchSettings } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';

interface ContactInfoBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function ContactInfoBlock({ props, slug }: ContactInfoBlockProps) {
  const title = (props.title as string) || '연락처';
  let settings;
  try {
    settings = await getChurchSettings(slug);
  } catch {
    return null;
  }

  // getChurchSettings returns raw snake_case keys (church_phone, social_youtube …)
  // — NOT camelCase. Read them by their real names or the block stays empty.
  const phone = settings.church_phone;
  const email = settings.church_email;
  const address = settings.church_address;
  const links = [
    { label: 'YouTube', url: settings.social_youtube },
    { label: 'Instagram', url: settings.social_instagram },
    { label: 'Facebook', url: settings.social_facebook },
    { label: 'KakaoTalk', url: settings.social_kakaotalk || settings.social_kakaotalk_channel },
  ].filter((l) => l.url);

  const accentSoft = 'color-mix(in srgb, var(--dw-primary, #2563eb) 12%, transparent)';
  const iconWrap = { backgroundColor: accentSoft, color: 'var(--dw-primary, #2563eb)' };

  return (
    <DataSection props={props}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
          <span aria-hidden="true" className="block h-[3px] w-12 rounded" style={{ backgroundColor: 'var(--dw-primary, #2563eb)' }} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {phone && (
            <div className="flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <span className="grid place-items-center w-11 h-11 rounded-xl shrink-0" style={iconWrap}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-400">전화</p>
                <a href={`tel:${phone}`} className="text-base font-semibold text-gray-800 hover:text-[var(--dw-primary)]">{phone}</a>
              </div>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <span className="grid place-items-center w-11 h-11 rounded-xl shrink-0" style={iconWrap}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-400">이메일</p>
                <a href={`mailto:${email}`} className="text-base font-semibold text-gray-800 hover:text-[var(--dw-primary)] break-all">{email}</a>
              </div>
            </div>
          )}
          {address && (
            <div className="flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm hover:shadow-md transition-shadow sm:col-span-2">
              <span className="grid place-items-center w-11 h-11 rounded-xl shrink-0" style={iconWrap}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-400">주소</p>
                <p className="text-base font-semibold text-gray-800">{address}</p>
              </div>
            </div>
          )}
        </div>
        {links.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-black/[0.08] bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:border-[var(--dw-primary)] hover:text-[var(--dw-primary)] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </DataSection>
  );
}
