import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Embed Widgets - True Light',
  description: '교회 콘텐츠를 외부 웹사이트에 쉽게 삽입하세요. 설교, 주보, 앨범, 행사, 교역자 위젯을 제공합니다.',
};

const WIDGET_TYPES = [
  {
    type: 'sermons',
    label: '설교',
    description: '최근 설교를 카드 그리드 형식으로 표시합니다. 유튜브 썸네일, 제목, 날짜, 설교자 정보가 포함됩니다.',
    example: `<div
  data-tenant="bethelfaith"
  data-type="sermons"
  data-limit="6"
  data-theme="light"
></div>`,
  },
  {
    type: 'bulletins',
    label: '주보',
    description: '최근 주보를 목록 형식으로 표시합니다. 날짜와 PDF 다운로드 링크가 포함됩니다.',
    example: `<div
  data-tenant="bethelfaith"
  data-type="bulletins"
  data-limit="4"
  data-theme="light"
></div>`,
  },
  {
    type: 'albums',
    label: '앨범',
    description: '교회 앨범을 이미지 그리드 형식으로 표시합니다. 대표 이미지와 제목이 오버레이로 표시됩니다.',
    example: `<div
  data-tenant="bethelfaith"
  data-type="albums"
  data-limit="6"
  data-theme="light"
></div>`,
  },
  {
    type: 'events',
    label: '행사',
    description: '교회 행사를 카드 형식으로 표시합니다. 날짜 배지, 행사명, 장소 정보가 포함됩니다.',
    example: `<div
  data-tenant="bethelfaith"
  data-type="events"
  data-limit="4"
  data-theme="light"
></div>`,
  },
  {
    type: 'staff',
    label: '교역자',
    description: '교역자 정보를 그리드 형식으로 표시합니다. 사진, 이름, 직분, 부서 정보가 포함됩니다.',
    example: `<div
  data-tenant="bethelfaith"
  data-type="staff"
  data-limit="8"
  data-theme="light"
></div>`,
  },
];

function CodeBlock({ code, language = 'html' }: { code: string; language?: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm leading-relaxed text-gray-100">
      <code data-language={language}>{code}</code>
    </pre>
  );
}

export default function EmbedPage() {
  const fullExample = `<!-- True Light 위젯 -->
<div
  data-tenant="your-tenant-slug"
  data-type="sermons"
  data-limit="6"
  data-theme="light"
></div>
<script src="https://truelight.app/embed.js"><\/script>`;

  const wordpressExample = `<!-- WordPress 페이지/포스트 HTML 블록에 붙여넣기 -->
<div
  data-tenant="your-tenant-slug"
  data-type="sermons"
  data-limit="6"
  data-theme="light"
></div>
<script src="https://truelight.app/embed.js"><\/script>`;

  const multipleExample = `<!-- 하나의 페이지에 여러 위젯 사용 가능 -->
<h2>최근 설교</h2>
<div data-tenant="bethelfaith" data-type="sermons" data-limit="3"></div>

<h2>이번 주 주보</h2>
<div data-tenant="bethelfaith" data-type="bulletins" data-limit="1"></div>

<h2>교회 앨범</h2>
<div data-tenant="bethelfaith" data-type="albums" data-limit="4"></div>

<!-- 스크립트는 한 번만 포함하면 됩니다 -->
<script src="https://truelight.app/embed.js"><\/script>`;

  const spaExample = `<!-- SPA 환경에서 동적으로 위젯 재초기화 -->
<script>
  // 새 위젯을 추가한 뒤 호출
  window.DWChurchEmbed.init();
<\/script>`;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/" className="text-xl font-bold text-blue-600">
            True Light
          </a>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Embed Docs
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Title */}
        <div className="mb-16">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">
            Embed Widgets
          </h1>
          <p className="max-w-2xl text-lg text-gray-600">
            True Light 위젯을 외부 웹사이트에 간단하게 삽입할 수 있습니다.
            WordPress, Wix, Squarespace, 또는 일반 HTML 사이트 어디서든 사용 가능합니다.
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">빠른 시작</h2>
          <p className="mb-4 text-gray-600">
            원하는 위치에 <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-gray-800">div</code> 태그와
            스크립트를 추가하면 됩니다.
          </p>
          <CodeBlock code={fullExample} />
        </section>

        {/* Attributes */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">속성 (Attributes)</h2>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-900">속성</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">필수</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">설명</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">기본값</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 font-mono text-blue-700">data-tenant</td>
                  <td className="px-4 py-3 text-red-600">필수</td>
                  <td className="px-4 py-3 text-gray-600">교회 테넌트 슬러그</td>
                  <td className="px-4 py-3 text-gray-400">-</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-blue-700">data-type</td>
                  <td className="px-4 py-3 text-red-600">필수</td>
                  <td className="px-4 py-3 text-gray-600">
                    위젯 유형: sermons, bulletins, albums, events, staff
                  </td>
                  <td className="px-4 py-3 text-gray-400">-</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-blue-700">data-limit</td>
                  <td className="px-4 py-3 text-gray-400">선택</td>
                  <td className="px-4 py-3 text-gray-600">표시할 항목 수</td>
                  <td className="px-4 py-3 font-mono text-gray-600">6</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-blue-700">data-theme</td>
                  <td className="px-4 py-3 text-gray-400">선택</td>
                  <td className="px-4 py-3 text-gray-600">
                    테마: <code className="rounded bg-gray-100 px-1 text-xs">light</code> 또는{' '}
                    <code className="rounded bg-gray-100 px-1 text-xs">dark</code>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">light</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Widget Types */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-bold text-gray-900">위젯 유형별 예제</h2>
          <div className="space-y-12">
            {WIDGET_TYPES.map((w) => (
              <div key={w.type} className="rounded-xl border border-gray-200 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {w.type}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">{w.label}</h3>
                </div>
                <p className="mb-4 text-sm text-gray-600">{w.description}</p>
                <CodeBlock code={w.example} />
              </div>
            ))}
          </div>
        </section>

        {/* Multiple Widgets */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">여러 위젯 동시 사용</h2>
          <p className="mb-4 text-gray-600">
            한 페이지에 여러 위젯을 배치할 수 있습니다. 스크립트는 한 번만 포함하면 모든 위젯을 자동으로 초기화합니다.
          </p>
          <CodeBlock code={multipleExample} />
        </section>

        {/* WordPress */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">WordPress에서 사용하기</h2>
          <ol className="mb-4 list-inside list-decimal space-y-2 text-gray-600">
            <li>WordPress 편집기에서 &quot;사용자 정의 HTML&quot; 블록을 추가합니다.</li>
            <li>아래 코드를 붙여넣고 <code className="rounded bg-gray-100 px-1 text-sm font-mono">your-tenant-slug</code>을 교회 슬러그로 변경합니다.</li>
            <li>저장하면 위젯이 자동으로 표시됩니다.</li>
          </ol>
          <CodeBlock code={wordpressExample} />
        </section>

        {/* Dark Theme */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">다크 테마</h2>
          <p className="mb-4 text-gray-600">
            어두운 배경의 웹사이트에서는 <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-gray-800">data-theme=&quot;dark&quot;</code>를
            사용하세요.
          </p>
          <CodeBlock
            code={`<div
  data-tenant="bethelfaith"
  data-type="sermons"
  data-limit="6"
  data-theme="dark"
></div>`}
          />
        </section>

        {/* SPA */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">SPA / 동적 페이지에서 사용</h2>
          <p className="mb-4 text-gray-600">
            React, Vue 등 SPA 환경에서 동적으로 위젯 컨테이너를 추가한 뒤, 아래 함수를 호출하면 새 위젯을 초기화합니다.
          </p>
          <CodeBlock code={spaExample} language="javascript" />
        </section>

        {/* Notes */}
        <section className="mb-16 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="mb-4 text-lg font-bold text-amber-900">참고 사항</h2>
          <ul className="space-y-2 text-sm text-amber-800">
            <li>
              위젯은 CORS가 활성화된 API를 통해 데이터를 가져옵니다. 별도의 API 키는 필요하지 않습니다.
            </li>
            <li>
              위젯 내 링크를 클릭하면 truelight.app의 해당 교회 페이지로 이동합니다.
            </li>
            <li>
              CSS는 스크립트 내에 포함되어 있어 별도의 스타일시트를 로드할 필요가 없습니다.
            </li>
            <li>
              모든 클래스는 <code className="rounded bg-amber-100 px-1 font-mono text-xs">dw-</code> 접두어를 사용하므로 기존 스타일과 충돌하지 않습니다.
            </li>
            <li>
              위젯은 반응형으로, 모바일부터 데스크톱까지 자동으로 레이아웃이 조정됩니다.
            </li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 px-6 py-8">
        <div className="mx-auto max-w-5xl text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} True Light. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
