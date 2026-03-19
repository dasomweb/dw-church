export interface PdfViewerProps {
  url: string;
  title?: string;
  className?: string;
}

export function PdfViewer({ url, title = 'PDF Document', className = '' }: PdfViewerProps) {
  if (!url) return null;

  return (
    <div className={`dw-flex dw-flex-col dw-gap-2 ${className}`}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="dw-inline-flex dw-items-center dw-gap-2 dw-rounded dw-bg-primary dw-px-4 dw-py-2 dw-text-sm dw-font-medium dw-text-white hover:dw-bg-primary-hover dw-transition-colors dw-w-fit"
      >
        <svg className="dw-h-4 dw-w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        PDF 다운로드
      </a>
      <iframe
        src={`${url}#toolbar=1&navpanes=0`}
        title={title}
        className="dw-h-[600px] dw-w-full dw-rounded dw-border dw-border-border"
      />
    </div>
  );
}
