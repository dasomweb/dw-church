import { DWChurchClient } from '@dw-church/api-client';
import type {
  ChurchSettings,
  Page,
  MenuItem,
  Theme,
  Sermon,
  Bulletin,
  Album,
  Staff,
  History,
  Event,
  Banner,
  PaginatedResponse,
} from '@dw-church/api-client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.dw-church.app';

// ─── SaaS API helpers (tenant-scoped) ──────────────────────────

async function tenantFetch<T>(slug: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1/tenants/${slug}${path}`, {
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

// ─── Settings & Navigation ─────────────────────────────────────

export async function getChurchSettings(slug: string): Promise<ChurchSettings> {
  return tenantFetch<ChurchSettings>(slug, '/settings');
}

export async function getMenuItems(slug: string): Promise<MenuItem[]> {
  return tenantFetch<MenuItem[]>(slug, '/menus');
}

export async function getTheme(slug: string): Promise<Theme> {
  return tenantFetch<Theme>(slug, '/theme');
}

// ─── Pages ─────────────────────────────────────────────────────

export async function getPages(slug: string): Promise<Page[]> {
  return tenantFetch<Page[]>(slug, '/pages');
}

export async function getHomePage(slug: string): Promise<Page> {
  return tenantFetch<Page>(slug, '/pages/home');
}

export async function getPageBySlug(tenantSlug: string, pageSlug: string): Promise<Page> {
  return tenantFetch<Page>(tenantSlug, `/pages/by-slug/${pageSlug}`);
}

// ─── Content (using DWChurchClient internally) ─────────────────

function createClient(slug: string): DWChurchClient {
  return new DWChurchClient({
    baseUrl: `${API_BASE}/api/v1/tenants/${slug}/wp`,
  });
}

export async function getSermons(
  slug: string,
  params?: { page?: number; perPage?: number; category?: string },
): Promise<PaginatedResponse<Sermon>> {
  const client = createClient(slug);
  return client.getSermons({
    page: params?.page ?? 1,
    perPage: params?.perPage ?? 12,
    category: params?.category,
  });
}

export async function getSermon(slug: string, id: number): Promise<Sermon> {
  const client = createClient(slug);
  return client.getSermon(id);
}

export async function getBulletins(
  slug: string,
  params?: { page?: number; perPage?: number },
): Promise<PaginatedResponse<Bulletin>> {
  const client = createClient(slug);
  return client.getBulletins({
    page: params?.page ?? 1,
    perPage: params?.perPage ?? 12,
  });
}

export async function getAlbums(
  slug: string,
  params?: { page?: number; perPage?: number },
): Promise<PaginatedResponse<Album>> {
  const client = createClient(slug);
  return client.getAlbums({
    page: params?.page ?? 1,
    perPage: params?.perPage ?? 12,
  });
}

export async function getStaff(slug: string): Promise<Staff[]> {
  const client = createClient(slug);
  return client.getStaff();
}

export async function getHistory(slug: string): Promise<History[]> {
  const client = createClient(slug);
  return client.getHistory();
}

export async function getEvents(
  slug: string,
  params?: { page?: number; perPage?: number },
): Promise<PaginatedResponse<Event>> {
  const client = createClient(slug);
  return client.getEvents({
    page: params?.page ?? 1,
    perPage: params?.perPage ?? 12,
  });
}

export async function getBanners(slug: string): Promise<PaginatedResponse<Banner>> {
  const client = createClient(slug);
  return client.getBanners({ active: true });
}
