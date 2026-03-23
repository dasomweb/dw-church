'use client';

import { SingleBulletin } from '@dw-church/ui-components';
import type { Bulletin } from '@dw-church/api-client';
import Link from 'next/link';

interface SingleBulletinClientProps {
  bulletin: Bulletin;
  slug: string;
}

export function SingleBulletinClient({ bulletin, slug }: SingleBulletinClientProps) {
  return (
    <div>
      <Link
        href={`/bulletins`}
        className="mb-6 inline-block text-sm text-[var(--dw-primary)] hover:underline"
      >
        &larr; 주보 목록
      </Link>
      <SingleBulletin data={bulletin} />
    </div>
  );
}
