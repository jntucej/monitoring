// @ts-nocheck
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

let _s3Client: S3Client | null = null;

export function isS3Configured(): boolean {
  return Boolean(process.env.S3_ENDPOINT && (process.env.S3_BUCKET || process.env.AWS_S3_BUCKET));
}

export function getS3Bucket(): string {
  return process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || "gate-uploads";
}

export function getS3Client(): S3Client {
  if (!_s3Client) {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.AWS_REGION || process.env.S3_REGION || "us-east-1";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || "minioadmin";
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || "minioadmin";

    _s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO / self-hosted S3-compatible endpoints
    });
  }
  return _s3Client;
}

export async function s3PutObject(key: string, body: Buffer, contentType?: string): Promise<void> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function s3GetObject(key: string): Promise<Buffer | null> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    if (!res.Body) return null;
    const byteArray = await res.Body.transformToByteArray();
    return Buffer.from(byteArray);
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "NoSuchKey" || (err as { "$metadata"?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

export async function s3ObjectExists(key: string): Promise<boolean> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function s3DeleteObject(key: string): Promise<void> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}
