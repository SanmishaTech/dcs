'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiGet, apiUpload, apiDelete } from '@/lib/api-client';
import { AppCard } from '@/components/common/app-card';
import { AppButton } from '@/components/common/app-button';
import { UploadInput } from '@/components/common/upload-input';
import { TextInput } from '@/components/common/text-input';
import { Form } from '@/components/ui/form';
import { usePermissions } from '@/hooks/use-permissions';
import { PERMISSIONS } from '@/config/roles';
import { toast } from '@/lib/toast';
import { DataTable, Column } from '@/components/common/data-table';
import { DeleteButton } from '@/components/common/delete-button';
import { OpenIconButton } from '@/components/common/icon-button';

interface ProjectFileItem {
	id: number;
	originalName: string;
	title?: string | null;
	filename: string;
	mimeType: string;
	size: number;
	createdAt: string;
	uploadedById: number | null;
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const val = bytes / Math.pow(k, i);
	return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export function ProjectFiles({ projectId }: { projectId: number }) {
	const { can } = usePermissions();
	const canUpload = can(PERMISSIONS.UPLOAD_PROJECT_FILE);
	const canDelete = can(PERMISSIONS.DELETE_PROJECT_FILE);
	const { data, mutate, isLoading } = useSWR<ProjectFileItem[]>(
		`/api/project-files?projectId=${projectId}`,
		apiGet
	);
	const [uploading, setUploading] = useState(false);
	const form = useForm<{ file: File | null; title: string }>({
		defaultValues: { file: null, title: '' },
	});
	const fileValue = form.watch('file');
	const titleValue = form.watch('title');
	const titleValid = titleValue.trim().length > 0;

	async function handleUploadSubmit(values: {
		file: File | null;
		title: string;
	}) {
		if (!values.file) {
			toast.error('Select a file');
			return;
		}
		if (!values.title.trim()) {
			toast.error('Title required');
			return;
		}
		const fd = new FormData();
		fd.append('projectId', String(projectId));
		fd.append('file', values.file);
		fd.append('title', values.title.trim());
		setUploading(true);
		try {
			await apiUpload('/api/project-files', fd);
			toast.success('Uploaded');
			form.reset({ file: null, title: '' });
			mutate();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setUploading(false);
		}
	}

	async function handleDelete(id: number) {
		try {
			await apiDelete(`/api/project-files?id=${id}`);
			toast.success('Deleted');
			mutate();
		} catch (e) {
			toast.error((e as Error).message);
		}
	}

	const columns: Column<ProjectFileItem>[] = [
		{
			key: 'originalName',
			header: 'File',
			accessor: (f) => f.title || f.originalName,
			cellClassName: 'whitespace-nowrap font-medium',
		},
		{
			key: 'mimeType',
			header: 'Type',
			accessor: (f) => f.mimeType,
			cellClassName: 'whitespace-nowrap',
		},
		{
			key: 'size',
			header: 'Size',
			accessor: (f) => formatBytes(f.size),
			className: 'text-right',
			cellClassName: 'text-right whitespace-nowrap tabular-nums',
		},
		{
			key: 'createdAt',
			header: 'Uploaded',
			accessor: (f) => new Date(f.createdAt).toLocaleDateString(),
			cellClassName: 'whitespace-nowrap',
		},
	];

	return (
		<AppCard className='mt-8'>
			<AppCard.Header>
				<AppCard.Title>Files</AppCard.Title>
				<AppCard.Description>Project attachments.</AppCard.Description>
			</AppCard.Header>
			<AppCard.Content className='space-y-4'>
				{canUpload && (
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleUploadSubmit)}
							className='flex flex-col gap-2 w-full max-w-xl'
						>
							<div className='flex flex-wrap gap-3 items-end'>
								<UploadInput
									control={form.control}
									name='file'
									label='File'
									required
									description='Max 20MB. Images, PDF, text, CSV, Excel (.xls/.xlsx).'
									maxSizeBytes={20 * 1024 * 1024}
									accept='image/*,application/pdf,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
								/>
								<TextInput
									control={form.control}
									name='title'
									label='Title'
									required
									placeholder='Enter title'
									itemClassName='min-w-[14rem]'
								/>
								<div className='flex items-center pb-2'>
									<AppButton
										size='sm'
										type='submit'
										disabled={uploading || !titleValid || !fileValue}
									>
										{uploading ? 'Uploading...' : 'Upload'}
									</AppButton>
								</div>
							</div>
						</form>
					</Form>
				)}
				<DataTable
					columns={columns}
					data={data || []}
					loading={isLoading}
					simpleStyle
					emptyMessage='No files'
					renderRowActions={(row) => (
						<div className='flex gap-2'>
							<a
								href={`/api/project-files/${row.id}/download`}
								target='_blank'
								rel='noopener noreferrer'
							>
								<OpenIconButton
									size='xs'
									tooltip='Open File'
									aria-label='Open File'
								/>
							</a>
							{canDelete && (
								<DeleteButton
									onDelete={() => handleDelete(row.id)}
									itemLabel='file'
									title='Delete file?'
									description={`This will permanently remove the file${
										row.id ? ` #${row.id}` : ''
									}. This action cannot be undone.`}
									confirmText='Delete'
									cancelText='Cancel'
									size='xs'
								/>
							)}
						</div>
					)}
					actionsHeader=''
				/>
			</AppCard.Content>
		</AppCard>
	);
}
