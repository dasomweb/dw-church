'use client';

// PreviewBridge — bidirectional click/highlight bridge for the super-admin
// page builder's live preview. It does NOTHING for normal visitors: it
// only activates when the page is loaded inside an iframe with ?preview=1
// (the builder appends that flag). Then:
//
//   • click on a section  → postMessage('dw-preview:select', {sectionId})
//                           to the parent (admin) → inspector focuses it
//   • parent sends 'dw-preview:highlight' {sectionId} → outline that section
//
// Section boundaries are tagged by BlockRenderer's `data-dw-section` wrapper.
import { useEffect } from 'react';

export function PreviewBridge() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') !== '1') return;       // not a builder preview
    if (window.parent === window) return;            // not embedded

    const style = document.createElement('style');
    style.textContent = `
      [data-dw-section]{position:relative;cursor:pointer}
      [data-dw-section]:hover{outline:2px dashed rgba(37,99,235,.55);outline-offset:-2px}
      [data-dw-section].dw-preview-selected{outline:2px solid #2563eb;outline-offset:-2px}
    `;
    document.head.appendChild(style);

    let selectedEl: Element | null = null;
    const setSelected = (id: string | null, scroll = false) => {
      if (selectedEl) selectedEl.classList.remove('dw-preview-selected');
      selectedEl = id ? document.querySelector(`[data-dw-section="${(window.CSS && CSS.escape) ? CSS.escape(id) : id}"]`) : null;
      if (selectedEl) {
        selectedEl.classList.add('dw-preview-selected');
        if (scroll) selectedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const sec = target?.closest('[data-dw-section]') as HTMLElement | null;
      if (!sec) return;
      // Selecting a section must not navigate the iframe away — swallow
      // link clicks (the operator switches pages from the builder's list).
      if (target?.closest('a')) e.preventDefault();
      const id = sec.getAttribute('data-dw-section');
      const blockType = sec.getAttribute('data-dw-blocktype') ?? '';
      setSelected(id);
      window.parent.postMessage({ type: 'dw-preview:select', sectionId: id, blockType }, '*');
    };
    document.addEventListener('click', onClick, true);

    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; sectionId?: string | null } | null;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'dw-preview:highlight') setSelected(d.sectionId ?? null, true);
    };
    window.addEventListener('message', onMsg);

    // Tell the parent we're ready so it can push the current selection.
    window.parent.postMessage({ type: 'dw-preview:ready' }, '*');

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('message', onMsg);
      style.remove();
    };
  }, []);

  return null;
}
