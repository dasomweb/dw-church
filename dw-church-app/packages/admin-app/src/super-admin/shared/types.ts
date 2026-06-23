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

// ─── Service applications (신청서 — website-build inbox) ──────
export type ApplicationStatus = 'new' | 'reviewing' | 'approved' | 'paid' | 'converted' | 'rejected';

export interface Application {
  id: string;
  churchName: string;
  contactName: string;
  email: string;
  phone: string | null;
  churchAddress: string | null;
  denomination: string | null;
  plantingType: string | null;
  memberProfile: string | null;
  localContext: string | null;
  faithAffirmed: boolean;
  plan: 'light' | 'basic' | 'plus' | 'pro' | null;
  billingPeriod: string | null;
  existingUrl: string | null;
  desiredDomain: string | null;
  message: string | null;
  status: ApplicationStatus;
  adminNote: string | null;
  paymentLink: string | null;
  createdAt: string;
  updatedAt: string;
  // 이단(cult) 자동 대조 결과 — 서버가 신청 교단·교회명을 참조 목록과 대조해 채움.
  denominationStatus: 'recognized' | 'watch' | 'cult' | null;
  denominationMatch: string | null;
  denominationVerified: boolean;
}
