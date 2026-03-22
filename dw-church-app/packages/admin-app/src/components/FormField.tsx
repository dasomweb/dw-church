import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: ReactNode;
  horizontal?: boolean;
}

export function FormField({ label, required, error, help, children, horizontal }: FormFieldProps) {
  if (horizontal) {
    return (
      <div className="flex items-start gap-4">
        <label className="text-sm font-medium text-gray-600 pt-2.5 w-32 shrink-0 text-right">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <div className="flex-1">
          {children}
          {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
          {help && !error && <p className="text-gray-400 text-xs mt-1.5">{help}</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
      {help && !error && <p className="text-gray-400 text-xs mt-1.5">{help}</p>}
    </div>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  noPad?: boolean;
}

export function FormSection({ title, description, children, noPad }: FormSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className={noPad ? '' : 'px-6 py-5 space-y-5'}>
        {children}
      </div>
    </div>
  );
}

interface FormRowProps {
  children: ReactNode;
  cols?: 2 | 3 | 4;
}

export function FormRow({ children, cols = 2 }: FormRowProps) {
  const gridClass = cols === 4
    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
    : cols === 3
    ? 'grid-cols-1 sm:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2';
  return <div className={`grid ${gridClass} gap-5`}>{children}</div>;
}

export const inputClass = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all';
export const selectClass = `${inputClass} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-10`;
export const textareaClass = `${inputClass} resize-y`;
