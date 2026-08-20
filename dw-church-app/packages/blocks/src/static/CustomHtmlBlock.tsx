/**
 * custom_html — renders a raw HTML fragment as-is. Used by "시안 그대로 적용"
 * (exact design apply): the chosen front-sample's real HTML/CSS (header/footer
 * stripped) is stored in props.html and rendered verbatim inside the tenant's
 * live site chrome, so the home matches the sample pixel-for-pixel instead of
 * being approximated by generic blocks. The HTML is operator/super-admin
 * curated and sanitized server-side (scripts/handlers stripped) before storage.
 */
interface CustomHtmlBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

export function CustomHtmlBlock({ props }: CustomHtmlBlockProps) {
  const html = (props.html as string) ?? '';
  if (!html) return null;
  return <div className="dw-custom-html" dangerouslySetInnerHTML={{ __html: html }} />;
}
