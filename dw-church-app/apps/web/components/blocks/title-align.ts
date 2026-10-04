/**
 * 데이터 블록 섹션 제목 정렬.
 *
 * 스태틱 블록(SectionShell/SectionHeadingRule 계열)은 전부 좌측 정렬인데
 * 데이터 블록만 `text-center` 로 박혀 있어서, 한 페이지에 둘을 섞으면 제목 줄이
 * 좌–중–좌 로 어긋나 보였다(대표님: "섹션들이 들쑥날쑥"). 기본값을 좌측으로
 * 맞추고, 가운데가 필요한 섹션은 인스펙터에서 titleAlign 으로 바꾼다.
 */
export function titleAlignClass(props: Record<string, unknown>): string {
  const v = String(props?.titleAlign ?? 'left');
  return v === 'center' ? 'text-center' : v === 'right' ? 'text-right' : '';
}
