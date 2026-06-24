import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import type {
  CreateFormInput,
  UpdateFormInput,
  CreateFieldInput,
  UpdateFieldInput,
} from './schema.js';

/**
 * Form Builder data access. Rows are returned in snake_case (SELECT *) — the
 * api-client FetchAdapter camelizes them for the browser, matching every other
 * content module. Submissions live in form_submissions (see forms module), not here.
 */
type Row = Record<string, unknown>;

// ── Forms ────────────────────────────────────────────────────────────────
export async function listForms(schema: string): Promise<Row[]> {
  return prisma.$queryRawUnsafe<Row[]>(
    `SELECT * FROM "${schema}".forms ORDER BY sort_order ASC, created_at ASC`,
  );
}

export async function getForm(schema: string, id: string): Promise<Row | null> {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT * FROM "${schema}".forms WHERE id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function getFormBySlug(schema: string, slug: string): Promise<Row | null> {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT * FROM "${schema}".forms WHERE slug = $1`,
    slug,
  );
  return rows[0] ?? null;
}

export async function listFields(schema: string, formId: string): Promise<Row[]> {
  return prisma.$queryRawUnsafe<Row[]>(
    `SELECT * FROM "${schema}".form_fields WHERE form_id = $1::uuid ORDER BY sort_order ASC, created_at ASC`,
    formId,
  );
}

/** Form + its fields, looked up by id or slug. Returns null if the form is missing. */
export async function getFormWithFields(
  schema: string,
  idOrSlug: string,
  by: 'id' | 'slug',
): Promise<{ form: Row; fields: Row[] } | null> {
  const form = by === 'id' ? await getForm(schema, idOrSlug) : await getFormBySlug(schema, idOrSlug);
  if (!form) return null;
  const fields = await listFields(schema, form.id as string);
  return { form, fields };
}

/** Find a free slug: if `base` is taken, try base_2, base_3, … (so a duplicate
 *  auto-numbers instead of erroring). */
async function uniqueFormSlug(schema: string, base: string): Promise<string> {
  if (!(await getFormBySlug(schema, base))) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}_${n}`;
    if (!(await getFormBySlug(schema, candidate))) return candidate;
  }
  throw new AppError('CONFLICT', 409, `'${base}' slug의 사용 가능한 변형을 찾지 못했습니다.`);
}

export async function createForm(schema: string, input: CreateFormInput): Promise<Row> {
  const slug = await uniqueFormSlug(schema, input.slug);
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `INSERT INTO "${schema}".forms
       (name, slug, description, submit_label, success_message, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    input.name,
    slug,
    input.description,
    input.submitLabel,
    input.successMessage,
    input.isActive,
    input.sortOrder,
  );
  return rows[0]!; // INSERT ... RETURNING always yields exactly one row
}

export async function updateForm(schema: string, id: string, input: UpdateFormInput): Promise<Row | null> {
  const map: Record<string, string> = {
    name: 'name',
    description: 'description',
    submitLabel: 'submit_label',
    successMessage: 'success_message',
    isActive: 'is_active',
    sortOrder: 'sort_order',
  };
  const set: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined) {
      set.push(`${col} = $${i++}`);
      vals.push(v);
    }
  }
  if (set.length === 0) return getForm(schema, id);
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `UPDATE "${schema}".forms SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...vals,
    id,
  );
  return rows[0] ?? null;
}

export async function deleteForm(schema: string, id: string): Promise<void> {
  // form_fields cascade via FK; submissions in form_submissions are intentionally
  // kept (deleting a form must not erase its received responses).
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".forms WHERE id = $1::uuid`, id);
}

// ── Fields ───────────────────────────────────────────────────────────────
export async function createField(schema: string, formId: string, input: CreateFieldInput): Promise<Row> {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `INSERT INTO "${schema}".form_fields
       (form_id, field_key, field_type, label, placeholder, help_text, is_required, sort_order, options)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     RETURNING *`,
    formId,
    input.fieldKey,
    input.fieldType,
    input.label,
    input.placeholder,
    input.helpText,
    input.isRequired,
    input.sortOrder,
    JSON.stringify(input.options),
  );
  return rows[0]!; // INSERT ... RETURNING always yields exactly one row
}

export async function getField(schema: string, id: string): Promise<Row | null> {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT * FROM "${schema}".form_fields WHERE id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function updateField(schema: string, id: string, input: UpdateFieldInput): Promise<Row | null> {
  const map: Record<string, string> = {
    fieldKey: 'field_key',
    fieldType: 'field_type',
    label: 'label',
    placeholder: 'placeholder',
    helpText: 'help_text',
    isRequired: 'is_required',
    sortOrder: 'sort_order',
  };
  const set: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined) {
      set.push(`${col} = $${i++}`);
      vals.push(v);
    }
  }
  if (input.options !== undefined) {
    set.push(`options = $${i++}::jsonb`);
    vals.push(JSON.stringify(input.options));
  }
  if (set.length === 0) return getField(schema, id);
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `UPDATE "${schema}".form_fields SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...vals,
    id,
  );
  return rows[0] ?? null;
}

export async function deleteField(schema: string, id: string): Promise<void> {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".form_fields WHERE id = $1::uuid`, id);
}

/** Set sort_order to the array index for each field id (drag-reorder persistence). */
export async function reorderFields(schema: string, formId: string, fieldIds: string[]): Promise<void> {
  await prisma.$transaction(
    fieldIds.map((fid, idx) =>
      prisma.$executeRawUnsafe(
        `UPDATE "${schema}".form_fields SET sort_order = $1, updated_at = NOW()
         WHERE id = $2::uuid AND form_id = $3::uuid`,
        idx,
        fid,
        formId,
      ),
    ),
  );
}
