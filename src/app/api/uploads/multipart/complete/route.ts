import { NextRequest, NextResponse } from 'next/server';
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { s3 } from '@/lib/s3';

export async function POST(req: NextRequest) {
  try {
  const { key, uploadId, parts } = await req.json();
    if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }
    // parts: [{ ETag, PartNumber }]
  type CompletedPart = { ETag: string; PartNumber: number | string };
    const cmd = new CompleteMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
    Parts: (parts as CompletedPart[]).map((p) => ({ ETag: p.ETag, PartNumber: Number(p.PartNumber) })),
      },
    });
    const out = await s3.send(cmd);
    return NextResponse.json({ location: out.Location, bucket: out.Bucket, key: out.Key });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to complete upload';
    return NextResponse.json({ message }, { status: 500 });
  }
}
