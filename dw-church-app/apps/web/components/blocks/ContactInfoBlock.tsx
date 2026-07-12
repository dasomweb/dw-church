import type { ReactNode } from 'react';
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

  // apiFetch camelizes the response, so the real keys are churchPhone /
  // socialYoutube (camelCase). Use the same robust fallback chain as the footer
  // (camelCase → snake → bare) so it works no matter how the field is stored.
  const phone = settings.churchPhone ?? settings.church_phone ?? settings.phone;
  const email = settings.churchEmail ?? settings.church_email ?? settings.email;
  const address = settings.churchAddress ?? settings.church_address ?? settings.address;
  const links = [
    { label: 'YouTube', url: settings.socialYoutube ?? settings.social_youtube },
    { label: 'Instagram', url: settings.socialInstagram ?? settings.social_instagram },
    { label: 'Facebook', url: settings.socialFacebook ?? settings.social_facebook },
    { label: 'KakaoTalk', url: settings.socialKakaotalkChannel ?? settings.social_kakaotalk_channel ?? settings.socialKakaotalk ?? settings.social_kakaotalk },
  ].filter((l) => l.url);

  // Brand-colored circular icon buttons (not plain text pills).
  const socialMeta: Record<string, { bg: string; fg: string; icon: ReactNode }> = {
    YouTube:   { bg: '#FF0000', fg: '#fff', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z" /></svg> },
    Instagram: { bg: 'radial-gradient(circle at 30% 110%, #fdf497 0%, #fd5949 45%, #d6249f 62%, #285AEB 95%)', fg: '#fff', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]"><rect x="2" y="2" width="20" height="20" rx="5.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" /></svg> },
    Facebook:  { bg: '#1877F2', fg: '#fff', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]"><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7v-3.5h3.1V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.2h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" /></svg> },
    KakaoTalk: { bg: '#FEE500', fg: '#3C1E1E', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]"><path d="M12 3C6.5 3 2 6.6 2 10.9c0 2.8 1.9 5.2 4.7 6.6-.2.6-.7 2.5-.8 2.9-.1.5.2.5.4.4.2-.1 2.7-1.8 3.8-2.6.6.1 1.3.1 1.9.1 5.5 0 10-3.6 10-8C22 6.6 17.5 3 12 3z" /></svg> },
  };

  const chip = { background: 'var(--dw-primary, #2563eb)' };
  const cardClass = 'group flex items-center gap-4 rounded-2xl border border-black/[0.05] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]';

  return (
    <DataSection props={props}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
          <span aria-hidden="true" className="block h-1 w-14 rounded-full" style={{ backgroundColor: 'var(--dw-primary, #2563eb)' }} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {phone && (
            <a href={`tel:${phone}`} className={cardClass}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm transition-transform duration-200 group-hover:scale-105" style={chip}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">전화</p>
                <p className="mt-0.5 text-base font-semibold text-gray-800 transition-colors group-hover:text-[var(--dw-primary)]">{phone}</p>
              </div>
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className={cardClass}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm transition-transform duration-200 group-hover:scale-105" style={chip}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">이메일</p>
                <p className="mt-0.5 text-base font-semibold text-gray-800 break-all transition-colors group-hover:text-[var(--dw-primary)]">{email}</p>
              </div>
            </a>
          )}
          {address && (
            <div className={`${cardClass} sm:col-span-2`}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm transition-transform duration-200 group-hover:scale-105" style={chip}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">주소</p>
                <p className="mt-0.5 text-base font-semibold text-gray-800">{address}</p>
              </div>
            </div>
          )}
        </div>
        {links.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {links.map((link) => {
              const m = socialMeta[link.label];
              return (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  title={link.label}
                  className="grid h-11 w-11 place-items-center rounded-full shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ background: m?.bg ?? 'var(--dw-primary, #2563eb)', color: m?.fg ?? '#fff' }}
                >
                  {m?.icon ?? <span className="text-xs font-semibold">{link.label.charAt(0)}</span>}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </DataSection>
  );
}
