/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Server-side API helpers for DW Church SaaS.
 * Uses plain fetch() — no @dw-church/api-client import to avoid
 * "createContext" error in Next.js Server Components.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://dw-church.vercel.app';

// ─── Generic fetch helper ────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Settings & Navigation ───────────────────────────────────

export async function getChurchSettings(slug: string): Promise<any> {
  return apiFetch(`/api/v1/settings`);
}

export async function getMenuItems(slug: string): Promise<any[]> {
  return apiFetch(`/api/v1/menus`);
}

export async function getTheme(slug: string): Promise<any> {
  return apiFetch(`/api/v1/theme`);
}

// ─── Pages ───────────────────────────────────────────────────

export async function getPages(slug: string): Promise<any[]> {
  return apiFetch(`/api/v1/pages`);
}

export async function getHomePage(slug: string): Promise<any> {
  return apiFetch(`/api/v1/pages/home`);
}

export async function getPageBySlug(tenantSlug: string, pageSlug: string): Promise<any> {
  return apiFetch(`/api/v1/pages/${pageSlug}`);
}

// ─── Sermons ─────────────────────────────────────────────────

export async function getSermons(
  slug: string,
  params?: { page?: number; perPage?: number; category?: string },
): Promise<any> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.perPage) p.set('per_page', String(params.perPage));
  if (params?.category) p.set('category', params.category);
  return apiFetch(`/api/v1/sermons?${p.toString()}`);
}

export async function getSermon(slug: string, id: string): Promise<any> {
  return apiFetch(`/api/v1/sermons/${id}`);
}

// ─── Bulletins ───────────────────────────────────────────────

export async function getBulletins(
  slug: string,
  params?: { page?: number; perPage?: number },
): Promise<any> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.perPage) p.set('per_page', String(params.perPage));
  return apiFetch(`/api/v1/bulletins?${p.toString()}`);
}

// ─── Albums ──────────────────────────────────────────────────

export async function getAlbums(
  slug: string,
  params?: { page?: number; perPage?: number },
): Promise<any> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.perPage) p.set('per_page', String(params.perPage));
  return apiFetch(`/api/v1/albums?${p.toString()}`);
}

// ─── Staff ───────────────────────────────────────────────────

export async function getStaff(slug: string): Promise<any[]> {
  return apiFetch(`/api/v1/staff`);
}

// ─── History ─────────────────────────────────────────────────

export async function getHistory(slug: string): Promise<any[]> {
  return apiFetch(`/api/v1/history`);
}

// ─── Events ──────────────────────────────────────────────────

export async function getEvents(
  slug: string,
  params?: { page?: number; perPage?: number },
): Promise<any> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.perPage) p.set('per_page', String(params.perPage));
  return apiFetch(`/api/v1/events?${p.toString()}`);
}

// ─── Banners ─────────────────────────────────────────────────

export async function getBanners(slug: string): Promise<any> {
  return apiFetch(`/api/v1/banners?active=true`);
}
