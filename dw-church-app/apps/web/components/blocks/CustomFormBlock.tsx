'use client';

import { useEffect, useState } from 'react';
import { DataSection } from './DataSection';

interface CustomFormBlockProps {
  props: Record<string, unknown>;
  slug: string; // tenant slug
}

type FieldType = 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'radio' | 'checkbox';
interface Field {
  id: string;
  fieldKey: string;
  fieldType: FieldType;
  label: string;
  placeholder: string;
  helpText: string;
  isRequired: boolean;
  options: { value: string; label: string }[];
}
interface FormDef {
  form: { id: string; name: string; slug: string; description: string; submitLabel: string; successMessage: string; isActive: boolean };
  fields: Field[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';
const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

// 커스텀 폼 Data Block — 운영자가 폼 빌더로 설계한 폼(목장보고서/새가족/문의 등)을
// slug로 불러와 렌더링한다. 제출은 서버에서 필드 정의에 맞춰 검증된 뒤 form_submissions
// (form_type=slug)로 저장되어 "폼 제출" 인박스에 쌓인다. props.formSlug 로 폼을 지정.
export function CustomFormBlock({ props, slug }: CustomFormBlockProps) {
  const formSlug = (props.formSlug as string) || (props.slug as string) || '';
  const [def, setDef] = useState<FormDef | null>(null);
  const [load, setLoad] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!formSlug) { setLoad('missing'); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/forms/${formSlug}/schema`, {
          headers: { 'X-Tenant-Slug': slug },
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        if (alive) { setDef(json.data as FormDef); setLoad('ready'); }
      } catch {
        if (alive) setLoad('missing');
      }
    })();
    return () => { alive = false; };
  }, [formSlug, slug]);

  const setVal = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }));

  const toggleMulti = (k: string, optValue: string) => {
    setValues((s) => {
      const cur = Array.isArray(s[k]) ? (s[k] as string[]) : [];
      return { ...s, [k]: cur.includes(optValue) ? cur.filter((x) => x !== optValue) : [...cur, optValue] };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!def) return;
    setState('submitting');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/forms/${formSlug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': slug },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message || String(res.status));
      }
      setState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '제출 중 문제가 발생했습니다.');
      setState('error');
    }
  };

  // 개발 중 slug 미지정 안내 (운영 화면에서는 아무것도 렌더하지 않음)
  if (load === 'missing') {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="mx-auto max-w-xl border border-dashed border-yellow-400 bg-yellow-50 px-6 py-4 text-sm text-yellow-700">
          폼을 찾을 수 없습니다. 블록 설정에서 <code>formSlug</code>를 확인하세요 (현재: <code>{formSlug || '(없음)'}</code>).
        </div>
      );
    }
    return null;
  }

  if (load === 'loading' || !def) {
    return (
      <DataSection props={props} defaultBg="var(--dw-surface)" paddingClassName="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-xl animate-pulse rounded-2xl border bg-white p-8 shadow-sm" style={{ borderColor: 'var(--dw-border, #e5e7eb)' }}>
          <div className="mb-4 h-6 w-1/3 rounded bg-gray-200" />
          <div className="space-y-3"><div className="h-10 rounded bg-gray-100" /><div className="h-10 rounded bg-gray-100" /></div>
        </div>
      </DataSection>
    );
  }

  const title = (props.title as string) || def.form.name;
  const subtitle = (props.subtitle as string) || def.form.description;

  if (state === 'done') {
    return (
      <DataSection props={props} defaultBg="var(--dw-surface)" paddingClassName="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-xl rounded-2xl border bg-white p-10 text-center shadow-sm" style={{ borderColor: 'var(--dw-border, #e5e7eb)' }}>
          <div className="mb-3 text-4xl">🙏</div>
          <h2 className="mb-2 text-2xl font-bold font-heading">{title}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-500">{def.form.successMessage || '제출해 주셔서 감사합니다.'}</p>
        </div>
      </DataSection>
    );
  }

  return (
    <DataSection props={props} defaultBg="var(--dw-surface)" paddingClassName="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold font-heading">{title}</h2>
          {subtitle && <p className="text-sm leading-relaxed text-gray-500">{subtitle}</p>}
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm sm:p-8" style={{ borderColor: 'var(--dw-border, #e5e7eb)' }}>
          {def.fields.map((f) => (
            <FieldInput key={f.id} field={f} value={values[f.fieldKey]} setVal={setVal} toggleMulti={toggleMulti} />
          ))}
          {state === 'error' && <p className="whitespace-pre-line text-sm text-red-600">{errorMsg}</p>}
          <button type="submit" disabled={state === 'submitting'}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
            {state === 'submitting' ? '제출 중...' : (def.form.submitLabel || '제출')}
          </button>
        </form>
      </div>
    </DataSection>
  );
}

function FieldInput({
  field: f, value, setVal, toggleMulti,
}: {
  field: Field;
  value: unknown;
  setVal: (k: string, v: unknown) => void;
  toggleMulti: (k: string, v: string) => void;
}) {
  const label = (
    <label className="mb-1 block text-sm font-medium text-gray-700">
      {f.label}{f.isRequired && <span className="text-red-500"> *</span>}
    </label>
  );
  const help = f.helpText ? <p className="mt-1 text-xs text-gray-400">{f.helpText}</p> : null;
  const v = (value as string) ?? '';

  switch (f.fieldType) {
    case 'textarea':
      return (
        <div>{label}
          <textarea required={f.isRequired} value={v} onChange={(e) => setVal(f.fieldKey, e.target.value)}
            rows={4} placeholder={f.placeholder} className={inputCls} />
          {help}
        </div>
      );
    case 'select':
      return (
        <div>{label}
          <select required={f.isRequired} value={v} onChange={(e) => setVal(f.fieldKey, e.target.value)} className={inputCls}>
            <option value="">{f.placeholder || '선택'}</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {help}
        </div>
      );
    case 'radio':
      return (
        <div>{label}
          <div className="space-y-1.5">
            {f.options.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name={f.fieldKey} value={o.value} required={f.isRequired}
                  checked={v === o.value} onChange={() => setVal(f.fieldKey, o.value)} />
                {o.label}
              </label>
            ))}
          </div>
          {help}
        </div>
      );
    case 'checkbox':
      // options present → multi-select; none → single consent checkbox
      if (f.options.length > 0) {
        const arr = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div>{label}
            <div className="space-y-1.5">
              {f.options.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={arr.includes(o.value)} onChange={() => toggleMulti(f.fieldKey, o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
            {help}
          </div>
        );
      }
      return (
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" required={f.isRequired} checked={value === true}
              onChange={(e) => setVal(f.fieldKey, e.target.checked)} />
            {f.label}{f.isRequired && <span className="text-red-500"> *</span>}
          </label>
          {help}
        </div>
      );
    default: {
      const type = f.fieldType === 'email' ? 'email' : f.fieldType === 'phone' ? 'tel' : f.fieldType === 'number' ? 'number' : f.fieldType === 'date' ? 'date' : 'text';
      return (
        <div>{label}
          <input type={type} required={f.isRequired} value={v} onChange={(e) => setVal(f.fieldKey, e.target.value)}
            placeholder={f.placeholder} className={inputCls} />
          {help}
        </div>
      );
    }
  }
}
