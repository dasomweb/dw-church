/**
 * Form-builder field validation — the authoritative server-side gate for public
 * submissions. Pure logic, no DB.
 */
import { describe, it, expect } from 'vitest';
import { validateSubmission, type FieldDef } from '../../modules/form-builder/field-validation.js';

const field = (over: Partial<FieldDef>): FieldDef => ({
  fieldKey: 'f',
  fieldType: 'text',
  label: '항목',
  isRequired: false,
  options: [],
  ...over,
});

describe('validateSubmission', () => {
  it('flags a missing required field', () => {
    const r = validateSubmission({}, [field({ fieldKey: 'name', label: '이름', isRequired: true })]);
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(1);
  });

  it('omits an empty optional field from cleaned', () => {
    const r = validateSubmission({ note: '   ' }, [field({ fieldKey: 'note' })]);
    expect(r.ok).toBe(true);
    expect(r.cleaned).toEqual({});
  });

  it('drops unknown keys not in the field set', () => {
    const r = validateSubmission({ name: 'Kim', evil: 'x' }, [field({ fieldKey: 'name' })]);
    expect(r.cleaned).toEqual({ name: 'Kim' });
  });

  it('validates email format', () => {
    const def = [field({ fieldKey: 'email', fieldType: 'email', label: '이메일' })];
    expect(validateSubmission({ email: 'bad' }, def).ok).toBe(false);
    expect(validateSubmission({ email: 'a@b.com' }, def).ok).toBe(true);
  });

  it('coerces number and rejects non-numbers', () => {
    const def = [field({ fieldKey: 'count', fieldType: 'number', label: '인원' })];
    expect(validateSubmission({ count: '42' }, def).cleaned).toEqual({ count: 42 });
    expect(validateSubmission({ count: 'abc' }, def).ok).toBe(false);
  });

  it('enforces YYYY-MM-DD dates', () => {
    const def = [field({ fieldKey: 'd', fieldType: 'date', label: '날짜' })];
    expect(validateSubmission({ d: '2026-06-24' }, def).ok).toBe(true);
    expect(validateSubmission({ d: '24/06/2026' }, def).ok).toBe(false);
  });

  it('restricts select/radio to defined options', () => {
    const def = [field({ fieldKey: 's', fieldType: 'select', label: '선택', options: [{ value: 'a', label: 'A' }] })];
    expect(validateSubmission({ s: 'a' }, def).ok).toBe(true);
    expect(validateSubmission({ s: 'z' }, def).ok).toBe(false);
  });

  it('treats checkbox with options as a multi-select subset', () => {
    const def = [field({
      fieldKey: 'c', fieldType: 'checkbox', label: '복수', isRequired: true,
      options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
    })];
    expect(validateSubmission({ c: ['a', 'b'] }, def).cleaned).toEqual({ c: ['a', 'b'] });
    expect(validateSubmission({ c: ['a', 'z'] }, def).ok).toBe(false);
  });

  it('treats an optionless checkbox as a boolean consent', () => {
    const def = [field({ fieldKey: 'agree', fieldType: 'checkbox', label: '동의', isRequired: true })];
    expect(validateSubmission({ agree: true }, def).cleaned).toEqual({ agree: true });
    expect(validateSubmission({ agree: false }, def).ok).toBe(false);
  });

  it('passes a fully valid multi-field submission', () => {
    const def = [
      field({ fieldKey: 'name', label: '이름', isRequired: true }),
      field({ fieldKey: 'phone', fieldType: 'phone', label: '연락처' }),
    ];
    const r = validateSubmission({ name: '홍길동', phone: '010-1234-5678' }, def);
    expect(r.ok).toBe(true);
    expect(r.cleaned).toEqual({ name: '홍길동', phone: '010-1234-5678' });
  });
});
