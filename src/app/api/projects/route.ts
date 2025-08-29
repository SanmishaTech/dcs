import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Success, Error } from '@/lib/api-response';
import { guardApiAccess } from '@/lib/access-guard';
import { paginate } from '@/lib/paginate';

// GET /api/projects?search=&page=1&perPage=10&sort=createdAt&order=desc
// Only projects the caller can see; PROJECT_USER is restricted to its own memberships.
export async function GET(req: NextRequest) {
  const auth = await guardApiAccess(req);
  if (auth.ok === false) return auth.response;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get('perPage')) || 10));
  const search = (searchParams.get('search') || '').trim();
  const sort = (searchParams.get('sort') || 'createdAt');
  const order = (searchParams.get('order') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  // Where builder
  type ProjectWhere = {
    OR?: { name?: { contains: string }; clientName?: { contains: string }; location?: { contains: string } }[];
    users?: { some: { userId: number } };
  };
  const where: ProjectWhere = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { clientName: { contains: search } },
      { location: { contains: search } },
    ];
  }
  // Membership restriction for project_user role
  if (user.role === 'project_user') {
    where.users = { some: { userId: user.id } };
  }

  const sortable = new Set(['name','clientName','location','createdAt']);
  const orderBy: Record<string, 'asc' | 'desc'> = sortable.has(sort) ? { [sort]: order } : { createdAt: 'desc' };

  const result = await paginate({
    model: prisma.project,
    where,
    orderBy,
    page,
    perPage,
    select: {
      id: true,
      name: true,
      clientName: true,
      location: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { users: true, files: true } },
    },
  });
  return Success(result);
}

// POST /api/projects  (Admin only enforced via permission guard CREATE_PROJECT)
export async function POST(req: NextRequest) {
  const auth = await guardApiAccess(req);
  if (auth.ok === false) return auth.response;

  let body: unknown;
  try { body = await req.json(); } catch { return Error('Invalid JSON body', 400); }
  const { name, clientName, location, description } = (body as Partial<{ name: string; clientName: string; location?: string; description?: string }>);
  if (!name) return Error('Name required', 400);
  if (!clientName) return Error('Client name required', 400);

  try {
    const created = await prisma.project.create({
      data: {
        name,
        clientName,
        location: location || null,
        description: description || null,
      },
      select: { id: true, name: true, clientName: true, location: true, description: true, createdAt: true, updatedAt: true },
    });
    return Success(created, 201);
  } catch {
    return Error('Failed to create project');
  }
}
