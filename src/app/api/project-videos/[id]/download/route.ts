import { NextRequest } from 'next/server';
import { guardApiAccess } from '@/lib/access-guard';
import { prisma } from '@/lib/prisma';
import { Error } from '@/lib/api-response';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from '@/lib/s3';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await guardApiAccess(req);
  if (auth.ok === false) return auth.response;
  const { user } = auth;
  const { id } = await ctx.params; const vid = Number(id);
  if (Number.isNaN(vid)) return Error('Invalid id', 400);

  try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec = await (prisma as any).projectVideo.findUnique({
      where: { id: vid },
      select: { id: true, projectId: true, storageKey: true },
    });
    if (!rec) return Error('Video not found', 404);
    if (user.role === 'project_user') {
      const membership = await prisma.projectUser.findFirst({ where: { projectId: rec.projectId, userId: user.id }, select: { id: true } });
      if (!membership) return Error('Forbidden', 403);
    }
    if (!rec.storageKey) return Error('File missing', 410);
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: rec.storageKey }),
      { expiresIn: 60 * 10 }
    );
    return Response.redirect(url, 302);
  } catch {
    return Error('Failed to download');
  }
}
