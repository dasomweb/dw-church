-- ═══════════════════════════════════════════════════════════════
-- Tenant Template Schema (reference only)
--
-- This migration is NOT executed by `prisma migrate deploy`.
-- Tenant schemas are created by cloning `tenant_template` via
-- the public.clone_schema() function.
--
-- The canonical source is: prisma/tenant-template.sql
-- This file exists so the migration history documents what
-- the per-tenant schema looks like at this point in time.
-- ═══════════════════════════════════════════════════════════════

-- ─── Preachers ──────────────────────────────────────────────
CREATE TABLE tenant_template.preachers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    is_default  BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sermon Categories ──────────────────────────────────────
CREATE TABLE tenant_template.sermon_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sermons ────────────────────────────────────────────────
CREATE TABLE tenant_template.sermons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL,
    scripture       VARCHAR(500),
    youtube_url     TEXT,
    sermon_date     DATE,
    thumbnail_url   TEXT,
    preacher_id     UUID REFERENCES tenant_template.preachers(id) ON DELETE SET NULL,
    status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sermons_date ON tenant_template.sermons(sermon_date DESC);
CREATE INDEX idx_sermons_status ON tenant_template.sermons(status);

-- ─── Sermon ↔ Category (M2M) ────────────────────────────────
CREATE TABLE tenant_template.sermon_category_map (
    sermon_id   UUID REFERENCES tenant_template.sermons(id) ON DELETE CASCADE,
    category_id UUID REFERENCES tenant_template.sermon_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (sermon_id, category_id)
);

-- ─── Bulletins ──────────────────────────────────────────────
CREATE TABLE tenant_template.bulletins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL,
    bulletin_date   DATE NOT NULL,
    pdf_url         TEXT,
    images          JSONB DEFAULT '[]',
    thumbnail_url   TEXT,
    status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bulletins_date ON tenant_template.bulletins(bulletin_date DESC);

-- ─── Pastoral Columns ───────────────────────────────────────
CREATE TABLE tenant_template.columns_pastoral (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(500) NOT NULL,
    content             TEXT,
    top_image_url       TEXT,
    bottom_image_url    TEXT,
    youtube_url         TEXT,
    thumbnail_url       TEXT,
    status              VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by          UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Album Categories ───────────────────────────────────────
CREATE TABLE tenant_template.album_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Albums ─────────────────────────────────────────────────
CREATE TABLE tenant_template.albums (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL,
    images          JSONB DEFAULT '[]',
    youtube_url     TEXT,
    thumbnail_url   TEXT,
    category_id     UUID REFERENCES tenant_template.album_categories(id) ON DELETE SET NULL,
    status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Banners ────────────────────────────────────────────────
CREATE TABLE tenant_template.banners (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(500) NOT NULL,
    pc_image_url        TEXT,
    mobile_image_url    TEXT,
    sub_image_url       TEXT,
    link_url            TEXT,
    link_target         VARCHAR(10) DEFAULT '_self',
    start_date          DATE,
    end_date            DATE,
    text_overlay        JSONB DEFAULT '{}',
    category            VARCHAR(20) DEFAULT 'main' CHECK (category IN ('main', 'sub')),
    sort_order          INT DEFAULT 0,
    status              VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Events ─────────────────────────────────────────────────
CREATE TABLE tenant_template.events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   VARCHAR(500) NOT NULL,
    background_image_url    TEXT,
    image_only              BOOLEAN DEFAULT false,
    department              VARCHAR(100),
    event_date              VARCHAR(255),
    location                VARCHAR(500),
    link_url                TEXT,
    description             TEXT,
    youtube_url             TEXT,
    thumbnail_url           TEXT,
    status                  VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Staff ──────────────────────────────────────────────────
CREATE TABLE tenant_template.staff (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    role        VARCHAR(100),
    department  VARCHAR(100),
    email       VARCHAR(255),
    phone       VARCHAR(50),
    bio         TEXT,
    photo_url   TEXT,
    sns_links   JSONB DEFAULT '{}',
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── History ────────────────────────────────────────────────
CREATE TABLE tenant_template.history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year        INT NOT NULL UNIQUE,
    items       JSONB DEFAULT '[]',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Pages ──────────────────────────────────────────────────
CREATE TABLE tenant_template.pages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    is_home     BOOLEAN DEFAULT false,
    status      VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published')),
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Page Sections (Blocks) ─────────────────────────────────
CREATE TABLE tenant_template.page_sections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id     UUID NOT NULL REFERENCES tenant_template.pages(id) ON DELETE CASCADE,
    block_type  VARCHAR(50) NOT NULL,
    props       JSONB DEFAULT '{}',
    sort_order  INT DEFAULT 0,
    is_visible  BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Navigation Menus ───────────────────────────────────────
CREATE TABLE tenant_template.menus (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label       VARCHAR(100) NOT NULL,
    page_id     UUID REFERENCES tenant_template.pages(id) ON DELETE SET NULL,
    external_url TEXT,
    parent_id   UUID REFERENCES tenant_template.menus(id) ON DELETE CASCADE,
    sort_order  INT DEFAULT 0,
    is_visible  BOOLEAN DEFAULT true
);

-- ─── Theme Settings ─────────────────────────────────────────
CREATE TABLE tenant_template.theme (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name   VARCHAR(50) DEFAULT 'modern',
    colors          JSONB DEFAULT '{"primary":"#2563eb","secondary":"#64748b","accent":"#f59e0b","background":"#ffffff","surface":"#f8fafc","text":"#0f172a"}',
    fonts           JSONB DEFAULT '{"heading":"Pretendard","body":"Pretendard"}',
    custom_css      TEXT DEFAULT '',
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Files ──────────────────────────────────────────────────
CREATE TABLE tenant_template.files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name   VARCHAR(500),
    storage_key     TEXT NOT NULL,
    url             TEXT NOT NULL,
    mime_type       VARCHAR(100),
    size_bytes      BIGINT,
    uploaded_by     UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Settings (Key-Value) ───────────────────────────────────
CREATE TABLE tenant_template.settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Schema Clone Function ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.clone_schema(
    source_schema TEXT,
    dest_schema TEXT
) RETURNS void AS $$
DECLARE
    rec RECORD;
BEGIN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', dest_schema);

    FOR rec IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = source_schema AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format(
            'CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)',
            dest_schema, rec.table_name, source_schema, rec.table_name
        );
    END LOOP;

    FOR rec IN
        SELECT
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS ref_table,
            ccu.column_name AS ref_column,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
            AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = source_schema
            AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        BEGIN
            EXECUTE format(
                'ALTER TABLE %I.%I ADD CONSTRAINT %s FOREIGN KEY (%I) REFERENCES %I.%I(%I) ON DELETE CASCADE',
                dest_schema, rec.table_name,
                rec.constraint_name || '_' || replace(dest_schema, 'tenant_', ''),
                rec.column_name, dest_schema, rec.ref_table, rec.ref_column
            );
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
