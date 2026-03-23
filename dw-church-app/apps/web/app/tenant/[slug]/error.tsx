'use client';

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold">문제가 발생했습니다</h2>
        <p className="mb-4 text-gray-500">잠시 후 다시 시도해주세요.</p>
        <p className="mb-4 text-xs text-gray-400">{error.message}</p>
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
