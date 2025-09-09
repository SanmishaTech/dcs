import { NextRequest, NextResponse } from 'next/server';
import { UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from '@/lib/s3';

export async function POST(req: NextRequest) {
  try {
    const { key, uploadId, partNumber, contentLength } = await req.json();
    if (!key || !uploadId || !partNumber) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }
    const cmd = new UploadPartCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      UploadId: uploadId,
      PartNumber: Number(partNumber),
      ContentLength: contentLength ? Number(contentLength) : undefined,
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 10 });
    return NextResponse.json({ url });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to sign part';
    return NextResponse.json({ message }, { status: 500 });
  }
}
