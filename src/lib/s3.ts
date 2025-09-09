import { S3Client } from '@aws-sdk/client-s3';

// Central S3 client. Uses explicit credentials if provided; otherwise falls back to IAM role on host (EC2/Lambda/etc.).
export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  forcePathStyle: true, // safer with bucket names containing dots over HTTPS
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});
