/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Success, Error } from '@/lib/api-response';
import { guardApiAccess } from '@/lib/access-guard';

// Shared select for crack fields used by design-strokes API
const CRACK_FOR_DISPLAY_SELECT = {
  id: true,
  defectType: true,
  blockId: true,
  chainageFrom: true,
  chainageTo: true,
  rl: true,
  lengthMm: true,
  widthMm: true,
  heightMm: true,
  videoFileName: true,
  startTime: true,
  endTime: true,
  block: { select: { id: true, name: true } },
} as const;

// GET /api/design-strokes?projectId=&crackIdentificationId=
export async function GET(req: NextRequest) {
  const auth = await guardApiAccess(req);
  if (auth.ok === false) return auth.response;
  const { searchParams } = new URL(req.url);
  const projectId = Number(searchParams.get('projectId'));
  const crackIdentificationId = searchParams.get('crackIdentificationId')
    ? Number(searchParams.get('crackIdentificationId'))
    : undefined;
  if (!projectId) return Error('projectId required', 400);
  const where: { projectId: number; crackIdentificationId?: number } = { projectId };
  if (crackIdentificationId) where.crackIdentificationId = crackIdentificationId;
  try {
  const strokes = await (prisma as any).designStroke.findMany({
      where,
      orderBy: { id: 'asc' },
      include: { crackIdentification: { select: CRACK_FOR_DISPLAY_SELECT } },
    });
    return Success({ items: strokes });
  } catch {
    return Error('Failed to fetch design strokes');
  }
}

// POST /api/design-strokes
// Body: { projectId, crackIdentificationId, path, thickness?, color? }
export async function POST(req: NextRequest) {
  const auth = await guardApiAccess(req);
  if (auth.ok === false) return auth.response;
  let body: unknown;
  try { body = await req.json(); } catch { return Error('Invalid JSON body', 400); }
  const { projectId, crackIdentificationId, path, thickness, color } = body as Partial<{
    projectId: number;
    crackIdentificationId: number;
    path: string;
    thickness: number;
    color: string | null;
  }>;
  if (!projectId) return Error('projectId required', 400);
  if (!crackIdentificationId) return Error('crackIdentificationId required', 400);
  if (!path || typeof path !== 'string') return Error('path required', 400);
  // Basic path validation: must start with 'M' and contain at least one 'L'
  const pathOk = /^M\s*[-\d.]+\s+[-\d.]+(\s+L\s*[-\d.]+\s+[-\d.]+)+\s*$/i.test(path.trim());
  if (!pathOk) return Error('Invalid path format', 400);
  try {
    // Ensure crack belongs to project
    const crack = await prisma.crackIdentification.findUnique({ where: { id: crackIdentificationId }, select: { projectId: true } });
    if (!crack || crack.projectId !== projectId) return Error('Crack not found in project', 404);
  const created = await (prisma as any).designStroke.create({
      data: { projectId, crackIdentificationId, path, thickness: typeof thickness === 'number' ? thickness : undefined, color: color ?? undefined },
    });
    return Success(created, 201);
  } catch {
    return Error('Failed to create design stroke');
  }
}

// DELETE /api/design-strokes?id=123 or JSON { id }
export async function DELETE(req: NextRequest) {
  const auth = await guardApiAccess(req);
  if (auth.ok === false) return auth.response;
  let id: number | null = null;
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try { const body = (await req.json()) as Partial<{ id: number | string }>; if (body?.id != null) id = Number(body.id); } catch { /* ignore */ }
  }
  if (id == null || Number.isNaN(id)) {
    const { searchParams } = new URL(req.url);
    const qp = searchParams.get('id');
    if (qp) id = Number(qp);
  }
  if (id == null || Number.isNaN(id)) return Error('id required', 400);
  try { await (prisma as any).designStroke.delete({ where: { id } }); return Success({ id }); } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'P2025') return Error('Not found', 404);
    return Error('Failed to delete design stroke');
  }
}
