import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Success, Error } from '@/lib/api-response';
import { guardApiAccess } from '@/lib/access-guard';

// GET /api/projects/:id (membership restricted for project_user)
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await guardApiAccess(req);
  if (auth.ok === false) return auth.response;
  const { user } = auth;
  const { id } = await context.params;
  const pid = Number(id);
  if (Number.isNaN(pid)) return Error('Invalid id', 400);

  try {
    const project = await prisma.project.findUnique({
      where: { id: pid },
      select: {
        id: true,
        name: true,
        clientName: true,
        location: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        users: { select: { userId: true } },
        _count: { select: { files: true } },
      },
    });
    if (!project) return Error('Project not found', 404);
    if (user.role === 'project_user' && !project.users.some(u => u.userId === user.id)) {
      return Error('Forbidden', 403);
    }
    return Success({ ...project, users: undefined });
  } catch {
    return Error('Failed to fetch project');
  }
}

// PATCH /api/projects/:id  (Admin only via UPDATE_PROJECT permission)
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await guardApiAccess(req);
  if (auth.ok === false) return auth.response;
  const { id } = await context.params;
  const pid = Number(id);
  if (Number.isNaN(pid)) return Error('Invalid id', 400);
  let body: unknown;
  try { body = await req.json(); } catch { return Error('Invalid JSON body', 400); }
  const { name, clientName, location, description } = (body as Partial<{ name: string; clientName: string; location?: string; description?: string }>);
  const data: Record<string, unknown> = {};
  if (typeof name === 'string') data.name = name;
  if (typeof clientName === 'string') data.clientName = clientName;
  if (typeof location === 'string') data.location = location || null;
  if (typeof description === 'string') data.description = description || null;
  if (Object.keys(data).length === 0) return Error('Nothing to update', 400);

  try {
    const updated = await prisma.project.update({
      where: { id: pid },
      data,
      select: { id: true, name: true, clientName: true, location: true, description: true, createdAt: true, updatedAt: true },
    });
    return Success(updated);
  } catch {
    return Error('Failed to update project');
  }
}

// DELETE /api/projects/:id  (Admin only via DELETE_PROJECT permission)
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await guardApiAccess(req);
  if (auth.ok === false) return auth.response;
  const { id } = await context.params;
  const pid = Number(id);
  if (Number.isNaN(pid)) return Error('Invalid id', 400);
  try {
    await prisma.project.delete({ where: { id: pid } });
    return Success({ id: pid });
  } catch {
    return Error('Failed to delete project');
  }
}
