import { useEffect, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';

interface TenantStats {
  sermonCount: number;
  userCount: number;
  storageUsed: number;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  stats?: TenantStats;
}

interface GlobalStats {
  totalTenants: number;
  activeTenants: number;
  totalSermons: number;
  totalStorage: number;
  planBreakdown: { plan: string; count: number }[];
}

interface TenantsResponse {
  data: Tenant[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function SuperAdminDashboard() {
  useDWChurchClient(); // ensure provider is available
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [totalTenantPages, setTotalTenantPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = (import.meta.env.VITE_API_BASE_URL as string) || '';
        const token = localStorage.getItem('dw_access_token') || '';
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        const [statsRes, tenantsRes] = await Promise.all([
          fetch(`${baseUrl}/api/v1/admin/stats`, { headers }).then(r => r.json()) as Promise<GlobalStats>,
          fetch(`${baseUrl}/api/v1/admin/tenants?page=${currentPage}&perPage=20`, { headers }).then(r => r.json()) as Promise<TenantsResponse>,
        ]);
        setStats(statsRes);
        setTenants(tenantsRes.data);
        setTotalTenantPages(tenantsRes.meta.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, [currentPage]);

  // Compute MRR from plan breakdown (estimated)
  const PLAN_MONTHLY_PRICES: Record<string, number> = {
    basic: 29,
    pro: 79,
    free: 0,
  };

  const mrr = stats
    ? stats.planBreakdown.reduce((sum, p) => {
        return sum + (PLAN_MONTHLY_PRICES[p.plan] ?? 0) * p.count;
      }, 0)
    : 0;

  const activeSubscriptions = stats
    ? stats.planBreakdown
        .filter((p) => p.plan !== 'free')
        .reduce((sum, p) => sum + p.count, 0)
    : 0;

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        <p className="font-medium">Error loading super admin dashboard</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform overview and tenant management
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Churches"
          value={stats?.totalTenants ?? 0}
          subtitle={`${stats?.activeTenants ?? 0} active`}
        />
        <StatCard
          title="Total Users"
          value="-"
          subtitle="Across all tenants"
        />
        <StatCard
          title="Active Subscriptions"
          value={activeSubscriptions}
          subtitle="Paid plans"
        />
        <StatCard
          title="MRR (Estimated)"
          value={`$${mrr.toLocaleString()}`}
          subtitle="Monthly recurring revenue"
        />
      </div>

      {/* Revenue Chart Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue</h2>
        <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">Revenue chart will be here</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Create Church Manually
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
            Send Announcement
          </button>
        </div>
      </div>

      {/* Churches Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Churches</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 font-medium">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Slug</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Sermons</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {tenant.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{tenant.slug}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        tenant.plan === 'pro'
                          ? 'bg-purple-100 text-purple-700'
                          : tenant.plan === 'basic'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {formatDate(tenant.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        tenant.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {tenant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {tenant.stats?.sermonCount ?? '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                        View
                      </button>
                      <button className="text-gray-500 hover:text-gray-700 text-xs font-medium">
                        Edit
                      </button>
                      <button className="text-red-500 hover:text-red-700 text-xs font-medium">
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    No churches found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalTenantPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {currentPage} of {totalTenantPages}
            </span>
            <button
              disabled={currentPage >= totalTenantPages}
              onClick={() => setCurrentPage((p) => Math.min(totalTenantPages, p + 1))}
              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Plan Breakdown */}
      {stats && stats.planBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Plan Distribution
          </h2>
          <div className="flex flex-wrap gap-4">
            {stats.planBreakdown.map((p) => (
              <div
                key={p.plan}
                className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3"
              >
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {p.plan}
                </span>
                <span className="text-lg font-bold text-gray-900">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
