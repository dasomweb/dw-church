/**
 * Upload an image to the platform (super-admin) bucket via
 * POST /api/v1/admin/shared-images/upload and return its absolute R2 URL.
 * Used by super-admin surfaces (email hero banners, portfolio, gallery) that
 * need a self-hosted URL — never a data: URI (email clients block those).
 * The ImageUpload component client-side-resizes before calling this.
 */
export async function uploadPlatformImage(
  file: File,
  accessToken: string | undefined,
  category = 'email',
): Promise<string> {
  const host = window.location.hostname;
  const base = host.startsWith('admin.')
    ? `https://api.${host.replace('admin.', '')}`
    : (import.meta.env.VITE_API_BASE_URL as string) || '';
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${base}/api/v1/admin/shared-images/upload?category=${encodeURIComponent(category)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken || ''}` },
    body: fd,
  });
  if (!res.ok) throw new Error('이미지 업로드에 실패했습니다.');
  const json = await res.json();
  return (json.data?.url ?? json.url) as string;
}
