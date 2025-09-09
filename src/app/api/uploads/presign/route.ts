import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

    // Minimal content-type checks by folder
    if (folder === 'designs' && !String(contentType).startsWith('image/')) {
      return NextResponse.json({ message: 'Invalid content type' }, { status: 400 });
    }
    if (folder === 'videos' && !String(contentType).startsWith('video/')) {
      return NextResponse.json({ message: 'Invalid content type' }, { status: 400 });
    }

    const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = safeName.includes('.') ? safeName.split('.').pop() : '';
    const key = `projects/${projectId}/${folder}/${nanoid()}${ext ? '.' + ext : ''}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
    return NextResponse.json({ url, key });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to presign';
    return NextResponse.json({ message }, { status: 500 });
  }
}
