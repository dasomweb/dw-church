import type { ReactElement } from 'react';

/**
 * 교회 구조화 데이터(JSON-LD) — schema.org/Church.
 *
 * 검색엔진(SEO)뿐 아니라 **AI 답변엔진(AEO/GEO)** 이 "○○지역 한인교회 주소/예배시간"
 * 같은 질문에 답할 때 근거로 쓰는 기계 판독용 사실 블록이다. 본문 파싱에만
 * 의존하면 교회 이름·주소·연락처가 추측으로 섞인다.
 *
 * **비어 있는 값은 넣지 않는다.** 주소를 아직 등록 안 한 교회에 빈 address 를
 * 내보내면 잘못된 사실을 주장하는 꼴이라, 있는 것만 싣는다.
 */

interface TenantJsonLdProps {
  origin: string;
  churchName: string;
  description?: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  address?: string;
  phone?: string;
  email?: string;
  /** SNS·유튜브 등 동일 주체를 가리키는 외부 링크 (schema.org sameAs) */
  sameAs?: string[];
}

export function TenantJsonLd({
  origin,
  churchName,
  description,
  logoUrl,
  imageUrl,
  address,
  phone,
  email,
  sameAs,
}: TenantJsonLdProps): ReactElement | null {
  if (!churchName) return null;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Church',
    name: churchName,
    url: origin,
  };
  if (description) data.description = description;
  if (logoUrl) data.logo = logoUrl;
  if (imageUrl || logoUrl) data.image = imageUrl || logoUrl;
  if (phone) data.telephone = phone;
  if (email) data.email = email;
  // 주소는 자유 입력 한 줄이라 구성요소로 쪼개지 않고 streetAddress 로 싣는다.
  if (address) data.address = { '@type': 'PostalAddress', streetAddress: address };
  const links = (sameAs ?? []).filter((u) => typeof u === 'string' && /^https?:\/\//.test(u));
  if (links.length > 0) data.sameAs = links;

  return (
    <script
      type="application/ld+json"
      // JSON.stringify 결과만 넣고, </script> 조기 종료만 막는다.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
