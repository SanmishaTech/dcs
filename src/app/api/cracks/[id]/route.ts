import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Success, Error as ApiError } from '@/lib/api-response';
import { guardApiAccess } from '@/lib/access-guard';

// PATCH /api/cracks/:id  body: { color?: 'yellow' | 'red' | 'white' | null }
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await guardApiAccess(req); if (auth.ok === false) return auth.response;
  const { id } = await context.params; const cid = Number(id); if (Number.isNaN(cid)) return ApiError('Invalid id', 400);
  let body: unknown; try { body = await req.json(); } catch { return ApiError('Invalid JSON body', 400); }
  const { color } = body as Partial<{ color: 'yellow' | 'red' | 'white' | null }>;
  if (!(color == null || color === 'yellow' || color === 'red' || color === 'white')) {
    return ApiError("color must be 'yellow' | 'red' | 'white' or null", 400);
  }
  try {
    // @ts-expect-error Prisma types may be stale in editor; 'color' exists in schema and runtime
    const updated = await prisma.crackIdentification.update({ where: { id: cid }, data: { color: color ?? null } });
    return Success(updated);
  } catch {
    return ApiError('Failed to update crack', 500);
  }
}
