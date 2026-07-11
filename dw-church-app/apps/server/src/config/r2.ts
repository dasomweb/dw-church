import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env.js';

const s3 = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file to R2 and return its public URL.
 */
export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  // The R2 object Key is stored raw, but the public URL must percent-encode each
  // path segment — document keys can now carry the original filename (spaces /
  // Korean / 등) which would otherwise produce an invalid URL. Encoding per
  // segment leaves the '/' separators intact; pure-ASCII keys (uuid images) are
  // unchanged since encodeURIComponent is a no-op for [A-Za-z0-9-_.~].
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `${env.R2_PUBLIC_URL}/${encodedKey}`;
}

/**
 * Server-side copy of an object within the bucket (no download/re-upload).
 * Used by the shared-image "copy-on-delete" safety: when a curated shared
 * image is removed, each tenant still using it gets its own copy first.
 * Returns the public URL of the new object.
 */
export async function copyFile(srcKey: string, destKey: string): Promise<string> {
  await s3.send(
    new CopyObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      // CopySource must be `<bucket>/<key>`, URL-encoded.
      CopySource: encodeURIComponent(`${env.R2_BUCKET_NAME}/${srcKey}`),
      Key: destKey,
    }),
  );
  return `${env.R2_PUBLIC_URL}/${destKey}`;
}

/**
 * Delete a file from R2.
 */
export async function deleteFile(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }),
  );
}

/**
 * Best-effort delete of R2 objects referenced by a set of stored URLs. Used by
 * content-delete services so removing a bulletin/album/etc. also removes its
 * uploaded files instead of orphaning them. ONLY deletes URLs that live in our
 * bucket (start with R2_PUBLIC_URL) — external URLs (YouTube thumbnails, pasted
 * links) are skipped. Failures are swallowed so a delete never fails on cleanup.
 */
export async function deleteUrlsFromR2(urls: Array<string | null | undefined>): Promise<void> {
  const prefix = `${env.R2_PUBLIC_URL}/`;
  const keys = new Set<string>();
  for (const u of urls) {
    if (typeof u === 'string' && u.startsWith(prefix)) {
      const raw = u.slice(prefix.length);
      try { keys.add(decodeURIComponent(raw)); } catch { keys.add(raw); }
    }
  }
  await Promise.all([...keys].map((k) => deleteFile(k).catch(() => {})));
}

/**
 * Flatten a stored value into URL strings. Handles a plain URL string, a jsonb
 * array of URL strings (albums.images, bulletins.images) or of objects with a
 * `url` field (board_posts.attachments), and nesting thereof.
 */
export function urlsFromValue(value: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (!v) return;
    if (typeof v === 'string') { out.push(v); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === 'object') {
      const url = (v as Record<string, unknown>).url;
      if (typeof url === 'string') out.push(url);
    }
  };
  walk(value);
  return out;
}

/**
 * List all objects under a prefix (e.g. "tenant_x/migration/"). Returns key +
 * size for each. Paginates through > 1000 objects. Used by the media-library
 * backfill that registers already-uploaded migration images.
 */
export async function listObjectsByPrefix(prefix: string): Promise<{ key: string; size: number }[]> {
  const out: { key: string; size: number }[] = [];
  let continuationToken: string | undefined;
  do {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of list.Contents ?? []) {
      if (obj.Key) out.push({ key: obj.Key, size: Number(obj.Size ?? 0) });
    }
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);
  return out;
}

/**
 * Delete all files with a given prefix (e.g. "tenant_bethelfaith/").
 */
export async function deleteFilesByPrefix(prefix: string): Promise<number> {
  let deleted = 0;
  let continuationToken: string | undefined;

  do {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const keys = (list.Contents ?? [])
      .map((obj) => obj.Key)
      .filter((k): k is string => Boolean(k));
    if (keys.length > 0) {
      // Batch delete (up to 1000 keys per call) instead of one request per
      // file — deleting a tenant with hundreds of images used to take ~40s
      // one-by-one, which made operators think the delete had hung and click
      // again (causing a duplicate-delete P2025 error).
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: env.R2_BUCKET_NAME,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      deleted += keys.length;
    }

    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);

  return deleted;
}

/**
 * Generate a time-limited signed URL for private access (default 1 hour).
 */
export async function getSignedUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  return awsGetSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }),
    { expiresIn },
  );
}
