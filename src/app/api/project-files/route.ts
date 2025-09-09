import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Success, Error } from '@/lib/api-response';
import { guardApiAccess } from '@/lib/access-guard';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '@/lib/s3';

// NOTE: This route treats files flatly. Optionally nest under /api/projects/:id/files.
// GET /api/project-files?projectId=1 (PROJECT_USER restricted to own membership)
export async function GET(req: NextRequest) {
	const auth = await guardApiAccess(req);
	if (auth.ok === false) return auth.response;
	const { user } = auth;
	const { searchParams } = new URL(req.url);
	const projectIdParam = searchParams.get('projectId');
	if (!projectIdParam) return Error('projectId required', 400);
	const projectId = Number(projectIdParam);
	if (Number.isNaN(projectId)) return Error('Invalid projectId', 400);

	// Membership check for project_user
	if (user.role === 'project_user') {
		const membership = await prisma.projectUser.findFirst({
			where: { projectId, userId: user.id },
			select: { id: true },
		});
		if (!membership) return Error('Forbidden', 403);
	}

	const files = await prisma.projectFile.findMany({
		where: { projectId },
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			originalName: true,
			title: true,
			mimeType: true,
			size: true,
			createdAt: true,
			uploadedById: true,
		},
	});
	return Success(files);
}

// POST /api/project-files  { projectId, originalName, mimeType, size, storageKey, title }
// Binary upload is handled by presigned PUT or multipart routes; this creates the metadata row.
export async function POST(req: NextRequest) {
	const auth = await guardApiAccess(req);
	if (auth.ok === false) return auth.response;
	const { user } = auth;
	let storageKeyOut: string | null = null; // S3 object key

		const MAX_FILE_SIZE_S3 = 20 * 1024 * 1024 * 1024; // 20GB for S3-backed uploads
		// Allow images, PDF, plain text, CSV, Excel, and videos
		const ALLOWED_MIME_PREFIXES = [
			'image/',
			'application/pdf',
			'text/plain',
			'text/csv',
			'application/vnd.ms-excel', // .xls
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
			'video/',
		];

	// Accept JSON metadata only (S3-backed)
	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return Error('Invalid JSON body', 400);
	}
	const { projectId, originalName: on, mimeType: mt, size: sz, storageKey, title: t } = body as Partial<{
		projectId: number | string;
		originalName: string;
		mimeType: string;
		size: number;
		storageKey: string;
		title: string;
	}>;
	if (projectId == null) return Error('projectId required', 400);
		const pidNum = Number(projectId);
		if (Number.isNaN(pidNum)) return Error('Invalid projectId', 400);
	if (!on || !mt || typeof sz !== 'number' || !t || !t.trim() || !storageKey)
		return Error('Missing file metadata', 400);
	if (sz > MAX_FILE_SIZE_S3) return Error('File too large', 413);
	if (!ALLOWED_MIME_PREFIXES.some((p) => mt?.startsWith(p)))
		return Error('File type not allowed', 415);
		const originalName = on;
	const mimeType = mt;
	const size = sz;
	storageKeyOut = storageKey;
	const title = t;

	// Basic presence check after branching
	if (
		!originalName ||
		!mimeType ||
		typeof size !== 'number'
	) {
		return Error('Incomplete file data', 400);
	}

	// Membership enforcement for project_user (cannot upload anyway due to permission guard; double check safety)
	if (user.role === 'project_user') return Error('Forbidden', 403);

	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const createData: any = {
			projectId: pidNum,
			originalName,
			title: title.trim(),
			mimeType,
			size,
			storageKey: storageKeyOut!,
			uploadedById: user.id,
		};
		const created = await prisma.projectFile.create({
						data: createData,
			select: {
				id: true,
		projectId: true,
				originalName: true,
				title: true,
				mimeType: true,
				size: true,
				createdAt: true,
			},
		});
		return Success(created, 201);
	} catch {
		return Error('Failed to create file record');
	}
}

// DELETE /api/project-files  { id }
export async function DELETE(req: NextRequest) {
	const auth = await guardApiAccess(req);
	if (auth.ok === false) return auth.response;

	// Support id via JSON body or query string (?id=) to avoid errors when body is empty
	let fid: number | null = null;
	const contentType = req.headers.get('content-type') || '';
	if (contentType.includes('application/json')) {
		try {
			const body = (await req.json()) as Partial<{ id: number | string }>;
			if (body?.id != null) fid = Number(body.id);
		} catch {
			// fall through, will attempt query param
		}
	}
	if (fid == null || Number.isNaN(fid)) {
		const { searchParams } = new URL(req.url);
		const qp = searchParams.get('id');
		if (qp) fid = Number(qp);
	}
	if (fid == null || Number.isNaN(fid)) return Error('id required', 400);

	try {
		const record = await prisma.projectFile.findUnique({
			where: { id: fid },
			select: { id: true, projectId: true, storageKey: true },
		});
		if (!record) return Error('File not found', 404);
			const deleted = await prisma.projectFile.delete({
			where: { id: fid },
			select: { id: true, projectId: true },
		});
		// Attempt S3 delete (ignore failure)
		s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: record.storageKey })).catch(() => {});
		return Success(deleted);
	} catch (e: unknown) {
		const err = e as { code?: string };
		if (err.code === 'P2025') return Error('File not found', 404);
		return Error('Failed to delete file');
	}
}
