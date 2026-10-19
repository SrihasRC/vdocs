import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  );
}

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME || "vdocs";
}

let s3ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client {
  if (s3ClientInstance) return s3ClientInstance;

  const accountId = process.env.R2_ACCOUNT_ID || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";

  s3ClientInstance = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientInstance;
}

/**
 * Generate a short-lived presigned PUT URL for uploading straight to Cloudflare R2 from browser.
 */
export async function getPresignedUploadUrl(
  storageKey: string,
  contentType: string,
  expiresInSeconds = 300
): Promise<string> {
  if (!isR2Configured()) {
    throw new Error(
      "Cloudflare R2 is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your environment."
    );
  }

  const client = getR2Client();
  const bucket = getR2BucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Upload an object directly to Cloudflare R2 from the server (bypasses browser CORS).
 */
export async function uploadR2Object(
  storageKey: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  if (!isR2Configured()) {
    throw new Error(
      "Cloudflare R2 is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your environment."
    );
  }

  const client = getR2Client();
  const bucket = getR2BucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);
}

/**
 * Generate a short-lived presigned GET URL for downloading private files from Cloudflare R2.
 */
export async function getPresignedDownloadUrl(
  storageKey: string,
  downloadFilename?: string,
  expiresInSeconds = 300
): Promise<string> {
  if (!isR2Configured()) {
    throw new Error(
      "Cloudflare R2 is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your environment."
    );
  }

  const client = getR2Client();
  const bucket = getR2BucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ResponseContentDisposition: downloadFilename
      ? `attachment; filename="${encodeURIComponent(downloadFilename)}"`
      : undefined,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Delete an object from Cloudflare R2.
 */
export async function deleteR2Object(storageKey: string): Promise<void> {
  if (!isR2Configured()) return;

  const client = getR2Client();
  const bucket = getR2BucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: storageKey,
  });

  await client.send(command);
}

/**
 * Query bucket statistics directly from Cloudflare R2
 */
export async function getR2BucketStats(): Promise<{
  configured: boolean;
  bucket: string;
  accountId: string;
  endpoint: string;
  totalObjects: number;
  totalSizeBytes: number;
  error?: string;
}> {
  const configured = isR2Configured();
  const bucket = getR2BucketName();
  const accountId = process.env.R2_ACCOUNT_ID || "";
  const maskedAccount =
    accountId.length > 8 ? `${accountId.slice(0, 4)}...${accountId.slice(-4)}` : accountId;
  const endpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "";

  if (!configured) {
    return {
      configured: false,
      bucket,
      accountId: maskedAccount,
      endpoint,
      totalObjects: 0,
      totalSizeBytes: 0,
      error: "R2 credentials not fully defined in .env.local",
    };
  }

  try {
    const client = getR2Client();
    const command = new ListObjectsV2Command({
      Bucket: bucket,
    });
    const res = await client.send(command);
    const objects = res.Contents || [];
    const totalSizeBytes = objects.reduce((sum, obj) => sum + (obj.Size || 0), 0);

    return {
      configured: true,
      bucket,
      accountId: maskedAccount,
      endpoint,
      totalObjects: objects.length,
      totalSizeBytes,
    };
  } catch (err: any) {
    return {
      configured: true,
      bucket,
      accountId: maskedAccount,
      endpoint,
      totalObjects: 0,
      totalSizeBytes: 0,
      error: err.message || "Failed to query Cloudflare R2 bucket",
    };
  }
}
