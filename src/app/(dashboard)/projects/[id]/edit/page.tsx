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
import { ProjectVideos } from './project-videos';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppCard } from '@/components/common/app-card';

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
			{initial?.id ? (
				<div className='mt-6'>
					<Tabs defaultValue='members'>
						<AppCard>
							<AppCard.Header className='flex flex-wrap items-center justify-between gap-2'>
								<AppCard.Title className='text-base'>Project data</AppCard.Title>
								<TabsList>
									<TabsTrigger value='members'>Members</TabsTrigger>
									<TabsTrigger value='files'>Files</TabsTrigger>
									<TabsTrigger value='videos'>Videos</TabsTrigger>
								</TabsList>
							</AppCard.Header>
							<AppCard.Content>
								<TabsContent value='members'>
									<ProjectMembers projectId={initial.id} embedded />
								</TabsContent>
								<TabsContent value='files'>
									<ProjectFiles projectId={initial.id} embedded />
								</TabsContent>
								<TabsContent value='videos'>
									<ProjectVideos projectId={initial.id} embedded />
								</TabsContent>
							</AppCard.Content>
						</AppCard>
					</Tabs>
				</div>
			) : null}
		</div>
	);
}
