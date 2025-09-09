import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Success, Error } from '@/lib/api-response';
import { guardApiAccess } from '@/lib/access-guard';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '@/lib/s3';

// GET /api/project-videos?projectId=1
export async function GET(req: NextRequest) {
  const auth = await guardApiAccess(req);
  if (auth.ok === false) return auth.response;
  const { user } = auth;
  const { searchParams } = new URL(req.url);
  const projectIdParam = searchParams.get('projectId');
  if (!projectIdParam) return Error('projectId required', 400);
  const projectId = Number(projectIdParam);
  if (Number.isNaN(projectId)) return Error('Invalid projectId', 400);

  if (user.role === 'project_user') {
    const membership = await prisma.projectUser.findFirst({ where: { projectId, userId: user.id }, select: { id: true } });
    if (!membership) return Error('Forbidden', 403);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videos = await (prisma as any).projectVideo.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
  });
  return Success(videos);
}

// POST /api/project-videos { projectId, originalName, mimeType, size, storageKey }
export async function POST(req: NextRequest) {
  const auth = await guardApiAccess(req);
  if (auth.ok === false) return auth.response;
  const { user } = auth;

  const MAX_SIZE = 20 * 1024 * 1024 * 1024; // 20GB
  let body: unknown;
  try { body = await req.json(); } catch { return Error('Invalid JSON body', 400); }
  const { projectId, originalName, mimeType, size, storageKey } = body as Partial<{ projectId: number | string; originalName: string; mimeType: string; size: number; storageKey: string }>;
  if (projectId == null || !originalName || !mimeType || typeof size !== 'number' || !storageKey) return Error('Missing metadata', 400);
  const pid = Number(projectId); if (Number.isNaN(pid)) return Error('Invalid projectId', 400);
  if (!mimeType.startsWith('video/')) return Error('Only video files allowed', 415);
  if (size > MAX_SIZE) return Error('File too large', 413);

  if (user.role === 'project_user') return Error('Forbidden', 403);

  try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created = await (prisma as any).projectVideo.create({
      data: { projectId: pid, originalName, mimeType, size, storageKey, uploadedById: user.id },
      select: { id: true, projectId: true, originalName: true, mimeType: true, size: true, createdAt: true },
    });
    return Success(created, 201);
  } catch {
    return Error('Failed to create video record');
  }
}

// DELETE /api/project-videos { id }
export async function DELETE(req: NextRequest) {
  const auth = await guardApiAccess(req);
  if (auth.ok === false) return auth.response;

  let vid: number | null = null;
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try { const body = (await req.json()) as Partial<{ id: number | string }>; if (body?.id != null) vid = Number(body.id); } catch {}
  }
  if (vid == null) {
    const { searchParams } = new URL(req.url); const qp = searchParams.get('id'); if (qp) vid = Number(qp);
  }
  if (vid == null || Number.isNaN(vid)) return Error('id required', 400);

  try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = await (prisma as any).projectVideo.findUnique({ where: { id: vid }, select: { id: true, storageKey: true } });
    if (!record) return Error('Video not found', 404);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deleted = await (prisma as any).projectVideo.delete({ where: { id: vid }, select: { id: true } });
    s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: record.storageKey })).catch(() => {});
    return Success(deleted);
  } catch (e: unknown) {
    const err = e as { code?: string }; if (err.code === 'P2025') return Error('Video not found', 404);
    return Error('Failed to delete video');
  }
}
