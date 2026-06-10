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
  return `${env.R2_PUBLIC_URL}/${key}`;
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
