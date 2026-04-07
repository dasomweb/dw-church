/**
 * One-time migration: create boards and board_posts tables for all existing tenant schemas.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */
import { prisma } from '../config/database.js';

const CREATE_BOARDS_SQL = (schema: string) => `
CREATE TABLE IF NOT EXISTS "${schema}".boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema}".board_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES "${schema}".boards(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  author_name VARCHAR(100) NOT NULL DEFAULT '',
  content TEXT DEFAULT '',
  attachments JSONB DEFAULT '[]',
  view_count INT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

export async function migrateBoards(): Promise<number> {
  // Get all tenant schemas + tenant_template
  const tenants = await prisma.$queryRawUnsafe<{ slug: string }[]>(
    `SELECT slug FROM public.tenants WHERE is_active = true`,
  );

  let total = 0;

  // Also apply to tenant_template so new tenants get it
  const schemas = ['tenant_template', ...tenants.map((t) => `tenant_${t.slug}`)];

  for (const schema of schemas) {
    try {
      await prisma.$executeRawUnsafe(CREATE_BOARDS_SQL(schema));
      total++;
    } catch (err) {
      // Log but don't fail — table may already exist
      console.warn(`Board migration for ${schema}: ${err}`);
    }
  }

  return total;
}
