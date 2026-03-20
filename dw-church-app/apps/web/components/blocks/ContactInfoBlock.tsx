import { getChurchSettings } from '@/lib/api';

interface ContactInfoBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function ContactInfoBlock({ slug }: ContactInfoBlockProps) {
  let settings;
  try {
    settings = await getChurchSettings(slug);
  } catch {
    return null;
  }

  const links = [
    { label: 'YouTube', url: settings.socialYoutube },
    { label: 'Instagram', url: settings.socialInstagram },
    { label: 'Facebook', url: settings.socialFacebook },
    { label: 'KakaoTalk', url: settings.socialKakaotalk },
  ].filter((l) => l.url);

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">연락처</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {settings.phone && (
            <div className="rounded-xl border border-gray-200 p-6 text-center">
              <p className="mb-1 text-sm font-medium text-gray-500">전화</p>
              <a href={`tel:${settings.phone}`} className="text-lg font-semibold text-[var(--dw-primary)]">
                {settings.phone}
              </a>
            </div>
          )}
          {settings.email && (
            <div className="rounded-xl border border-gray-200 p-6 text-center">
              <p className="mb-1 text-sm font-medium text-gray-500">이메일</p>
              <a href={`mailto:${settings.email}`} className="text-lg font-semibold text-[var(--dw-primary)]">
                {settings.email}
              </a>
            </div>
          )}
          {settings.address && (
            <div className="rounded-xl border border-gray-200 p-6 text-center sm:col-span-2">
              <p className="mb-1 text-sm font-medium text-gray-500">주소</p>
              <p className="text-lg font-semibold">{settings.address}</p>
            </div>
          )}
        </div>
        {links.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
