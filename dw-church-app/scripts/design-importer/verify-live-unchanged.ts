#!/usr/bin/env tsx
/**
 * verify-live-unchanged — live-safety harness (playbook §6).
 *
 * When the importer touches SHARED code (the storefront block renderer, a token),
 * every OTHER live tenant must stay byte-for-byte the same. This fetches a
 * tenant's storefront home, computes a structural fingerprint (ignoring volatile
 * bits — nonces, csrf, build ids, timestamps, whitespace), and compares it to a
 * saved baseline. PASS = unchanged; FAIL = investigate/rollback.
 *
 * Usage:
 *   # capture a baseline (before a shared-code change):
 *   pnpm dlx tsx scripts/design-importer/verify-live-unchanged.ts capture wakechurch dasom
 *   # verify after deploying:
 *   pnpm dlx tsx scripts/design-importer/verify-live-unchanged.ts verify wakechurch dasom
 *
 * Baseline file: scripts/design-importer/live-baseline.json (commit it).
 * Storefront base URL: STOREFRONT_BASE (default https://<slug>.truelight.app).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE = join(HERE, 'live-baseline.json');

/**
 * Structural fingerprint of a storefront HTML: a sha256 over the markup with
 * volatile attributes stripped, plus the ordered list of rendered block types
 * (data-block-type / data-dw-section markers). Pure + deterministic — exported
 * for unit testing.
 */
export function fingerprint(html: string): { hash: string; blocks: string[] } {
  const blocks = [
    ...html.matchAll(/data-(?:block-type|dw-section)=["']([^"']+)["']/gi),
  ].map((m) => m[1] as string);

  const normalized = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // volatile attributes that legitimately change every render/deploy:
    .replace(/\b(nonce|integrity|data-csrf|data-build|data-timestamp)=["'][^"']*["']/gi, '')
    .replace(/\b(name|content)=["']csrf-token["'][^>]*>/gi, '')
    .replace(/_next\/static\/[^/"']+/g, '_next/static/BUILD') // Next.js build id
    .replace(/\?v=[0-9a-f.]+/gi, '')                          // asset cache-busters
    .replace(/\s+/g, ' ')
    .trim();

  return { hash: createHash('sha256').update(normalized).digest('hex'), blocks };
}

// ── runner ─────────────────────────────────────────────────────────────────

type Baseline = Record<string, { hash: string; blocks: string[]; capturedAt: string }>;

function storefrontUrl(slug: string): string {
  const base = process.env.STOREFRONT_BASE;
  if (base) return base.replace('{slug}', slug);
  return `https://${slug}.truelight.app`;
}

async function fetchHome(slug: string): Promise<string> {
  const res = await fetch(storefrontUrl(slug), { headers: { 'User-Agent': 'tl-verify-live/1.0' } });
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  return await res.text();
}

function loadBaseline(): Baseline {
  return existsSync(BASELINE) ? (JSON.parse(readFileSync(BASELINE, 'utf8')) as Baseline) : {};
}

async function main(): Promise<void> {
  const [mode, ...slugs] = process.argv.slice(2);
  if ((mode !== 'capture' && mode !== 'verify') || slugs.length === 0) {
    console.error('usage: verify-live-unchanged.ts <capture|verify> <slug...>');
    process.exit(2);
  }
  const baseline = loadBaseline();

  if (mode === 'capture') {
    for (const slug of slugs) {
      const fp = fingerprint(await fetchHome(slug));
      baseline[slug] = { ...fp, capturedAt: new Date().toISOString() };
      console.log(`captured ${slug} — ${fp.blocks.length} blocks, ${fp.hash.slice(0, 12)}…`);
    }
    writeFileSync(BASELINE, JSON.stringify(baseline, null, 2) + '\n');
    console.log(`✓ baseline → ${BASELINE}`);
    return;
  }

  let failed = false;
  for (const slug of slugs) {
    const base = baseline[slug];
    if (!base) { console.error(`✗ ${slug}: no baseline (run capture first)`); failed = true; continue; }
    const fp = fingerprint(await fetchHome(slug));
    if (fp.hash === base.hash) {
      console.log(`✓ ${slug} UNCHANGED (${fp.blocks.length} blocks)`);
    } else {
      failed = true;
      console.error(`✗ ${slug} CHANGED — baseline ${base.hash.slice(0, 12)}… vs now ${fp.hash.slice(0, 12)}…`);
      console.error(`   blocks baseline=[${base.blocks.join(',')}] now=[${fp.blocks.join(',')}]`);
    }
  }
  if (failed) { console.error('FAIL — investigate or roll back before shipping.'); process.exit(1); }
  console.log('PASS — all tenants unchanged.');
}

import { argv } from 'node:process';
if (argv[1] && argv[1].replace(/\\/g, '/').endsWith('verify-live-unchanged.ts')) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
