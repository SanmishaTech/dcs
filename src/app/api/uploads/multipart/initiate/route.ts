import { NextRequest, NextResponse } from 'next/server';
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import { s3 } from '@/lib/s3';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 16);

export async function POST(req: NextRequest) {
  try {
    const { projectId, folder, fileName, contentType } = await req.json();
    if (!projectId || !folder || !fileName || !contentType) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }
    const allowedFolders = new Set(['designs', 'files', 'videos']);
    if (!allowedFolders.has(String(folder))) {
      return NextResponse.json({ message: 'Invalid folder' }, { status: 400 });
    }
    const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = safeName.includes('.') ? safeName.split('.').pop() : '';
    const key = `projects/${projectId}/${folder}/${nanoid()}${ext ? '.' + ext : ''}`;

    const command = new CreateMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: contentType,
    });
    const out = await s3.send(command);
    if (!out.UploadId) {
      return NextResponse.json({ message: 'Failed to initiate upload' }, { status: 500 });
    }
    return NextResponse.json({ key, uploadId: out.UploadId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to initiate multipart upload';
    return NextResponse.json({ message }, { status: 500 });
  }
}
