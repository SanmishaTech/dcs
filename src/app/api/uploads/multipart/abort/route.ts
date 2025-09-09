import { NextRequest, NextResponse } from 'next/server';
import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { s3 } from '@/lib/s3';

export async function POST(req: NextRequest) {
  try {
    const { key, uploadId } = await req.json();
    if (!key || !uploadId) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }
    const cmd = new AbortMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      UploadId: uploadId,
    });
    await s3.send(cmd);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to abort upload';
    return NextResponse.json({ message }, { status: 500 });
  }
}
