import type { FieldType } from './schema.js';

/**
 * Pure server-side validation of a public submission against a form's field
 * definitions. No DB imports → unit-testable. The storefront also validates with
 * HTML5, but this is the authoritative gate: it drops unknown keys, enforces
 * required/type rules, and returns a cleaned payload keyed by field_key.
 */
export interface FieldDef {
  fieldKey: string;
  fieldType: FieldType;
  label: string;
  isRequired: boolean;
  options: { value: string; label: string }[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  cleaned: Record<string, unknown>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function validateSubmission(
  payload: Record<string, unknown>,
  fields: FieldDef[],
): ValidationResult {
  const errors: string[] = [];
  const cleaned: Record<string, unknown> = {};

  for (const f of fields) {
    const raw = payload[f.fieldKey];

    if (isEmpty(raw)) {
      if (f.isRequired) errors.push(`'${f.label}' 항목은 필수입니다.`);
      continue; // empty optional field → omit from cleaned
    }

    const optionValues = new Set(f.options.map((o) => o.value));

    switch (f.fieldType) {
      case 'text':
      case 'textarea': {
        cleaned[f.fieldKey] = String(raw).slice(0, 5000);
        break;
      }
      case 'email': {
        const s = String(raw).trim();
        if (!EMAIL_RE.test(s)) errors.push(`'${f.label}' 항목의 이메일 형식이 올바르지 않습니다.`);
        else cleaned[f.fieldKey] = s;
        break;
      }
      case 'phone': {
        const s = String(raw).trim();
        if (!/\d/.test(s)) errors.push(`'${f.label}' 항목의 전화번호 형식이 올바르지 않습니다.`);
        else cleaned[f.fieldKey] = s.slice(0, 120);
        break;
      }
      case 'number': {
        const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
        if (!Number.isFinite(n)) errors.push(`'${f.label}' 항목은 숫자여야 합니다.`);
        else cleaned[f.fieldKey] = n;
        break;
      }
      case 'date': {
        const s = String(raw).trim();
        if (!DATE_RE.test(s) || Number.isNaN(Date.parse(s))) {
          errors.push(`'${f.label}' 항목의 날짜 형식(YYYY-MM-DD)이 올바르지 않습니다.`);
        } else {
          cleaned[f.fieldKey] = s;
        }
        break;
      }
      case 'select':
      case 'radio': {
        const s = String(raw);
        if (!optionValues.has(s)) errors.push(`'${f.label}' 항목의 선택값이 올바르지 않습니다.`);
        else cleaned[f.fieldKey] = s;
        break;
      }
      case 'checkbox': {
        // With options → multi-select (array, subset of options).
        // Without options → single consent checkbox (boolean true).
        if (f.options.length > 0) {
          const arr = Array.isArray(raw) ? raw.map(String) : [String(raw)];
          const invalid = arr.filter((v) => !optionValues.has(v));
          if (invalid.length) errors.push(`'${f.label}' 항목의 선택값이 올바르지 않습니다.`);
          else cleaned[f.fieldKey] = arr;
        } else {
          const truthy = raw === true || raw === 'true' || raw === 'on' || raw === 1 || raw === '1';
          if (f.isRequired && !truthy) errors.push(`'${f.label}' 항목에 동의해야 합니다.`);
          else cleaned[f.fieldKey] = truthy;
        }
        break;
      }
      default: {
        // Unknown type — store as string defensively.
        cleaned[f.fieldKey] = String(raw).slice(0, 5000);
      }
    }
  }

  return { ok: errors.length === 0, errors, cleaned };
}
