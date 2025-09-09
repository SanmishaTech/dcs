import { NextRequest } from 'next/server';
import { guardApiAccess } from '@/lib/access-guard';
import { prisma } from '@/lib/prisma';
import { Error } from '@/lib/api-response';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from '@/lib/s3';

// GET /api/project-files/:id/download  -> returns binary file with auth/membership checks
export async function GET(
	req: NextRequest,
	ctx: { params: Promise<{ id: string }> }
) {
	const auth = await guardApiAccess(req);
	if (auth.ok === false) return auth.response; // permission enforced by access-control (READ_PROJECT_FILE)
	const { user } = auth;
	const { id } = await ctx.params;
	const fid = Number(id);
	if (Number.isNaN(fid)) return Error('Invalid id', 400);

	try {
	const fileRec = await prisma.projectFile.findUnique({
			where: { id: fid },
			select: {
				id: true,
				projectId: true,
				filename: true,
				originalName: true,
				mimeType: true,
				size: true,
		storageKey: true,
			},
		});
		if (!fileRec) return Error('File not found', 404);
		if (user.role === 'project_user') {
			const membership = await prisma.projectUser.findFirst({
				where: { projectId: fileRec.projectId, userId: user.id },
				select: { id: true },
			});
			if (!membership) return Error('Forbidden', 403);
		}
		// If stored in S3, redirect to a presigned URL; otherwise treat as missing
		if (!fileRec.storageKey) return Error('File missing', 410);
		const url = await getSignedUrl(
			s3,
			new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: fileRec.storageKey }),
			{ expiresIn: 60 * 10 }
		);
		return Response.redirect(url, 302);
	} catch {
		return Error('Failed to download');
	}
}

// Local filename sanitization removed due to S3-only storage
