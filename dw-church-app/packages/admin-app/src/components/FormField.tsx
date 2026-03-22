import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: ReactNode;
}

export function FormField({ label, required, error, help, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {help && !error && <p className="text-gray-400 text-xs mt-1">{help}</p>}
    </div>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <fieldset className="border border-gray-200 rounded-xl p-5 space-y-4">
      <legend className="text-sm font-semibold text-gray-800 px-2">{title}</legend>
      {description && <p className="text-xs text-gray-500 -mt-2">{description}</p>}
      {children}
    </fieldset>
  );
}

interface FormRowProps {
  children: ReactNode;
  cols?: 2 | 3;
}

export function FormRow({ children, cols = 2 }: FormRowProps) {
  const gridClass = cols === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2';
  return <div className={`grid ${gridClass} gap-4`}>{children}</div>;
}

export const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors';
export const selectClass = inputClass;
export const textareaClass = `${inputClass} resize-y`;
