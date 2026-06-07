/**
 * LabeledField — tiny wrapper that owns the canonical "label above a
 * control" pattern used everywhere in the inspector.
 *
 * Why exists
 *   The same JSX recipe was hand-rolled 20+ times across
 *   `ElementInspector.tsx`:
 *
 *     <div>
 *       <label className="block text-[11px] font-medium text-gray-600 mb-1">
 *         …label text…
 *       </label>
 *       <input … />
 *     </div>
 *
 *   Subtle drift was creeping in (text-xs vs text-[11px], mb-1 vs mb-0.5,
 *   text-gray-600 vs text-gray-700). Centralising the wrapper locks the
 *   typography and spacing in one place so every inspector control reads
 *   the same way — and shrinks call sites from 4 lines to 1.
 *
 *   The label is the public contract; the control is whatever the caller
 *   wants (input / select / button group / picker). No wrapping around
 *   <select> specifically — keeps the component dumb and the caller in
 *   full control of focus / disabled / size of the actual input.
 *
 * Naming
 *   `LabeledField` (not `LabelledField` UK) to match the rest of the
 *   property-fields/ vocabulary (BoxSidesField, ColorField, SpacingField).
 */

import type { ReactNode } from 'react';

export interface LabeledFieldProps {
  /** Operator-facing label text. */
  label: string;
  /** Optional inline help text shown below the control (10px muted). */
  hint?: string;
  /** Wrapper className (rarely needed — only when the parent grid layout
   *  needs the field to span columns or take a specific min-width). */
  className?: string;
  /** The actual control — input / select / button group / etc. */
  children: ReactNode;
}

export function LabeledField({ label, hint, className, children }: LabeledFieldProps) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-medium text-gray-600 mb-1">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-[10px] text-gray-400 leading-snug">{hint}</p>
      )}
    </div>
  );
}
