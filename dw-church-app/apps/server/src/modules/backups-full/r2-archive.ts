/**
 * R2 archive helpers for the tenant full-backup system. Talks to a DEDICATED
 * backup bucket (env.R2_BACKUP_BUCKET_NAME) using the same R2 credentials /
 * endpoint as the content bucket. Cross-bucket server-side CopyObject moves
 * media bytes between the content bucket and the backup bucket without ever
 * streaming through this server.
 *
 * The backup list is derived by LISTING this bucket (folder = snapshot), so no
 * DB table tracks backups — the operational DB can be lost entirely and the
 * backups remain listable + restorable from R2 alone.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error-handler.js';

const s3 = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export const MAIN_BUCKET = env.R2_BUCKET_NAME;

/** The backup bucket, or throw a clear error if the feature isn't configured. */
export function backupBucket(): string {
  if (!env.R2_BACKUP_BUCKET_NAME) {
    throw new AppError(
      'BACKUP_BUCKET_UNSET',
      503,
      '백업 버킷이 설정되지 않았습니다. R2_BACKUP_BUCKET_NAME 환경변수를 지정하세요.',
    );
  }
  return env.R2_BACKUP_BUCKET_NAME;
}

/** True when the full-backup feature is configured (bucket set). */
export function isBackupConfigured(): boolean {
  return Boolean(env.R2_BACKUP_BUCKET_NAME);
}

export async function putBackupObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: backupBucket(), Key: key, Body: body, ContentType: contentType }));
}

export async function getBackupObject(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: backupBucket(), Key: key }));
  const body = res.Body as unknown as { transformToByteArray: () => Promise<Uint8Array> };
  return Buffer.from(await body.transformToByteArray());
}

/** Does an object exist in the backup bucket? (used to detect a valid snapshot) */
export async function backupObjectExists(key: string): Promise<boolean> {
  const list = await s3.send(new ListObjectsV2Command({ Bucket: backupBucket(), Prefix: key, MaxKeys: 1 }));
  return (list.Contents ?? []).some((o) => o.Key === key);
}

/** List immediate sub-"folders" under a prefix (via Delimiter). Returns the
 *  folder names without the trailing slash. */
export async function listBackupPrefixes(prefix: string): Promise<string[]> {
  const out: string[] = [];
  let token: string | undefined;
  do {
    const list = await s3.send(
      new ListObjectsV2Command({ Bucket: backupBucket(), Prefix: prefix, Delimiter: '/', ContinuationToken: token }),
    );
    for (const cp of list.CommonPrefixes ?? []) {
      if (cp.Prefix) out.push(cp.Prefix.slice(prefix.length).replace(/\/$/, ''));
    }
    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);
  return out;
}

/** List every object (key + size) under a prefix in a given bucket. */
export async function listObjects(bucket: string, prefix: string): Promise<{ key: string; size: number }[]> {
  const out: { key: string; size: number }[] = [];
  let token: string | undefined;
  do {
    const list = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
    );
    for (const o of list.Contents ?? []) if (o.Key) out.push({ key: o.Key, size: Number(o.Size ?? 0) });
    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);
  return out;
}

/** Delete every object under a prefix in a given bucket (batched, 1000/call). */
export async function deletePrefix(bucket: string, prefix: string): Promise<number> {
  let deleted = 0;
  let token: string | undefined;
  do {
    const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    const keys = (list.Contents ?? []).map((o) => o.Key).filter((k): k is string => Boolean(k));
    if (keys.length > 0) {
      await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }));
      deleted += keys.length;
    }
    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);
  return deleted;
}

/** Server-side copy one object between buckets (no download). */
export async function copyObject(srcBucket: string, srcKey: string, destBucket: string, destKey: string): Promise<void> {
  await s3.send(
    new CopyObjectCommand({
      Bucket: destBucket,
      CopySource: encodeURIComponent(`${srcBucket}/${srcKey}`),
      Key: destKey,
    }),
  );
}

/** Copy many objects with bounded concurrency (default 16, like b2bsmart). */
export async function copyObjectsConcurrent(
  jobs: { srcBucket: string; srcKey: string; destBucket: string; destKey: string }[],
  concurrency = 16,
): Promise<number> {
  let done = 0;
  let i = 0;
  async function worker() {
    while (i < jobs.length) {
      const job = jobs[i++]!;
      await copyObject(job.srcBucket, job.srcKey, job.destBucket, job.destKey);
      done++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, () => worker()));
  return done;
}
