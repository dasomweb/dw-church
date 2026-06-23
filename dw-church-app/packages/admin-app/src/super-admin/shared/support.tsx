// Shared support-ticket types and presentational helpers (Phase 4).

export type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  tenantSlug: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: SupportStatus;
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
}

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  open: '대기',
  in_progress: '처리중',
  resolved: '해결',
  closed: '종료',
};

export const SUPPORT_STATUS_COLORS: Record<SupportStatus, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

export const SUPPORT_STATUS_ORDER: SupportStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

export function SupportStatusBadge({ status }: { status: SupportStatus }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
        SUPPORT_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {SUPPORT_STATUS_LABELS[status] || status}
    </span>
  );
}
