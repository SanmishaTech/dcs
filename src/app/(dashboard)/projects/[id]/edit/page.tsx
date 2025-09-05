'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import ProjectForm, {
	ProjectFormInitialData,
} from '@/app/(dashboard)/projects/project-form';
import { ProjectMembers } from './project-members';
import { ProjectFiles } from './project-files';

export default function EditProjectPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [initial, setInitial] = useState<ProjectFormInitialData | null>(null);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const data = await apiGet<{
					id: number;
					name: string;
					clientName: string;
					location: string | null;
					description: string | null;
					designImage?: string | null;
				}>(`/api/projects/${id}`);
				setInitial({
					id: data.id,
					name: data.name,
					clientName: data.clientName,
					location: data.location || '',
					description: data.description || '',
					designImage: data.designImage || null,
				});
			} catch (e) {
				toast.error((e as Error).message || 'Failed to load project');
				router.push('/projects');
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, [id, router]);

	if (loading) return <div className='p-6'>Loading...</div>;
	return (
		<div>
			<ProjectForm mode='edit' initial={initial} />
			{initial?.id ? <ProjectMembers projectId={initial.id} /> : null}
			{initial?.id ? <ProjectFiles projectId={initial.id} /> : null}
		</div>
	);
}
