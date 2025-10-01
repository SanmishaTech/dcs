import { S3Client } from '@aws-sdk/client-s3';
import type { RequestChecksumCalculation } from '@aws-sdk/middleware-flexible-checksums';

// Central S3 client. Uses explicit credentials if provided; otherwise falls back to IAM role on host (EC2/Lambda/etc.).
export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  forcePathStyle: true, // safer with bucket names containing dots over HTTPS
  // Avoid adding checksum query params/headers in presigned URLs to simplify CORS
  // and reduce client requirements. S3 still validates integrity.
  requestChecksumCalculation: 'DISABLED' as RequestChecksumCalculation,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});
