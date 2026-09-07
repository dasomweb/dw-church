import { prisma } from '../../config/database.js';
import type { CreateNewcomerHistoryInput } from './schema.js';

/**
 * 새가족 정착 히스토리 서비스 — newcomer_history 테이블(테넌트 스키마).
 * 한 새가족(newcomer_id)에 여러 후속 기록이 시간순으로 쌓인다.
 * 반환 row는 snake_case이며 api-client FetchAdapter가 camelCase로 변환한다.
 */
export async function listNewcomerHistory(schema: string, newcomerId: string) {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".newcomer_history
     WHERE newcomer_id = $1::uuid
     ORDER BY entry_date DESC, created_at DESC`,
    newcomerId,
  );
}

export async function addNewcomerHistory(
  schema: string,
  newcomerId: string,
  input: CreateNewcomerHistoryInput,
) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".newcomer_history
       ("newcomer_id", "entry_date", "type", "content", "author")
     VALUES ($1::uuid, $2, $3, $4, $5)
     RETURNING *`,
    newcomerId,
    input.entryDate,
    input.type,
    input.content,
    input.author ?? null,
  );
  return rows[0];
}

export async function deleteNewcomerHistory(schema: string, historyId: string) {
  await prisma.$executeRawUnsafe(
    `DELETE FROM "${schema}".newcomer_history WHERE id = $1::uuid`,
    historyId,
  );
}
