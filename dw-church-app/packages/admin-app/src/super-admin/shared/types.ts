// Shared domain types for the super-admin dashboard (tenants, stats, users, domains).

export interface TenantStats {
  sermonCount: number;
  userCount: number;
  storageUsed: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  customDomain?: string;
  stats?: TenantStats;
  lastActivityAt?: string;
  dbSize?: number;
}

export interface GlobalStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalSermons: number;
  totalStorage: number;
  totalDbSize: number;
  planBreakdown: { plan: string; count: number }[];
}

export interface TenantsResponse {
  data: Tenant[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

export interface Domain {
  id: string;
  domain: string;
  tenantId: string;
  tenantName: string;
  verified: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantName: string;
  isActive: boolean;
  isLocked: boolean;
  createdAt: string;
}

export interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  customDomain?: string;
  sermonCount: number;
  userCount: number;
  storageUsed: number;
  dbSize: number;
  fileCount: number;
  users: { id: string; email: string; name: string; role: string }[];
  domains: { id: string; domain: string; verified: boolean }[];
}
