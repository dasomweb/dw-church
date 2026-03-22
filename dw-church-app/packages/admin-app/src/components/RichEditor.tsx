import { useRef, useCallback } from 'react';

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichEditor({ value, onChange, placeholder = '내용을 입력하세요...', minHeight = '200px' }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 p-1.5 bg-gray-50 border-b border-gray-200">
        <ToolButton onClick={() => exec('bold')} title="굵게">
          <strong>B</strong>
        </ToolButton>
        <ToolButton onClick={() => exec('italic')} title="기울임">
          <em>I</em>
        </ToolButton>
        <ToolButton onClick={() => exec('underline')} title="밑줄">
          <u>U</u>
        </ToolButton>
        <Divider />
        <ToolButton onClick={() => exec('formatBlock', 'h2')} title="제목">
          H2
        </ToolButton>
        <ToolButton onClick={() => exec('formatBlock', 'h3')} title="소제목">
          H3
        </ToolButton>
        <ToolButton onClick={() => exec('formatBlock', 'p')} title="본문">
          P
        </ToolButton>
        <Divider />
        <ToolButton onClick={() => exec('insertUnorderedList')} title="목록">
          •
        </ToolButton>
        <ToolButton onClick={() => exec('insertOrderedList')} title="번호 목록">
          1.
        </ToolButton>
        <Divider />
        <ToolButton onClick={() => exec('justifyLeft')} title="왼쪽 정렬">
          ≡
        </ToolButton>
        <ToolButton onClick={() => exec('justifyCenter')} title="가운데 정렬">
          ≡
        </ToolButton>
        <ToolButton onClick={() => exec('justifyRight')} title="오른쪽 정렬">
          ≡
        </ToolButton>
        <Divider />
        <ToolButton
          onClick={() => {
            const url = prompt('링크 URL을 입력하세요');
            if (url) exec('createLink', url);
          }}
          title="링크"
        >
          🔗
        </ToolButton>
        <ToolButton onClick={() => exec('removeFormat')} title="서식 제거">
          ✕
        </ToolButton>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: value }}
        className="p-4 outline-none prose prose-sm max-w-none"
        style={{ minHeight }}
        data-placeholder={placeholder}
      />
    </div>
  );
}

function ToolButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-8 h-8 flex items-center justify-center text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-gray-300 mx-1 self-center" />;
}
