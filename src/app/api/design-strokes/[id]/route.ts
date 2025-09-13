/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Success, Error } from '@/lib/api-response';
import { guardApiAccess } from '@/lib/access-guard';

// GET /api/design-strokes/:id
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await guardApiAccess(req); if (auth.ok === false) return auth.response;
  const { id } = await context.params; const sid = Number(id); if (Number.isNaN(sid)) return Error('Invalid id', 400);
  try {
    const stroke = await (prisma as any).designStroke.findUnique({ where: { id: sid } });
    if (!stroke) return Error('Not found', 404);
    return Success(stroke);
  } catch { return Error('Failed to fetch design stroke'); }
}

// PATCH /api/design-strokes/:id body: { path?, thickness?, color?, crackIdentificationId? }
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await guardApiAccess(req); if (auth.ok === false) return auth.response;
  const { id } = await context.params; const sid = Number(id); if (Number.isNaN(sid)) return Error('Invalid id', 400);
  let body: unknown; try { body = await req.json(); } catch { return Error('Invalid JSON body', 400); }
  const { path, thickness, color, crackIdentificationId } = body as Partial<{ path: string; thickness: number; color: string | null; crackIdentificationId: number }>;
  const data: Record<string, unknown> = {};
  if (typeof path === 'string') {
    const trimmed = path.trim();
    const pixelRE = /^M\s*[-\d.]+\s+[-\d.]+(\s+L\s*[-\d.]+\s+[-\d.]+)+\s*$/i;
    const normRE = /^N\s+M\s*[-\d.]+\s+[-\d.]+(\s+L\s*[-\d.]+\s+[-\d.]+)+\s*$/i;
    const ok = pixelRE.test(trimmed) || normRE.test(trimmed);
    if (!ok) return Error('Invalid path format', 400);
    data.path = path;
  }
  if (typeof thickness === 'number') data.thickness = thickness;
  if (typeof color === 'string' || color === null) data.color = color ?? null;
  try {
    if (typeof crackIdentificationId === 'number') {
      // ensure crack belongs to the same project
      const existing = await (prisma as any).designStroke.findUnique({ where: { id: sid }, select: { projectId: true } });
      if (!existing) return Error('Not found', 404);
      const crack = await prisma.crackIdentification.findUnique({ where: { id: crackIdentificationId }, select: { projectId: true } });
      if (!crack || crack.projectId !== existing.projectId) return Error('crackIdentificationId does not belong to this project', 400);
      (data as any).crackIdentificationId = crackIdentificationId;
    }
    if (Object.keys(data).length === 0) return Error('Nothing to update', 400);
    const updated = await (prisma as any).designStroke.update({ where: { id: sid }, data });
    return Success(updated);
  } catch { return Error('Failed to update design stroke'); }
}

// DELETE /api/design-strokes/:id
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await guardApiAccess(req); if (auth.ok === false) return auth.response;
  const { id } = await context.params; const sid = Number(id); if (Number.isNaN(sid)) return Error('Invalid id', 400);
  try { await (prisma as any).designStroke.delete({ where: { id: sid } }); return Success({ id: sid }); } catch { return Error('Failed to delete design stroke'); }
}
