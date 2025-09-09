'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { apiGet, apiDelete } from '@/lib/api-client';
import { multipartUpload } from '@/lib/multipart-upload';
import { AppCard } from '@/components/common/app-card';
import { AppButton } from '@/components/common/app-button';
import { UploadInput } from '@/components/common/upload-input';
import { DataTable, Column } from '@/components/common/data-table';
import { DeleteButton } from '@/components/common/delete-button';
import { OpenIconButton } from '@/components/common/icon-button';
import { usePermissions } from '@/hooks/use-permissions';
import { PERMISSIONS } from '@/config/roles';
import { toast } from '@/lib/toast';
import { formatBytes } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';

interface ProjectVideoItem {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export function ProjectVideos({ projectId, embedded = false }: { projectId: number; embedded?: boolean }) {
  const { can } = usePermissions();
  const canUpload = can(PERMISSIONS.UPLOAD_PROJECT_FILE);
  const canDelete = can(PERMISSIONS.DELETE_PROJECT_FILE);
  const { data, mutate, isLoading } = useSWR<ProjectVideoItem[]>(
    `/api/project-videos?projectId=${projectId}`,
    apiGet
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const form = useForm<{ file: File | null }>({ defaultValues: { file: null } });
  const file = form.watch('file');

  async function handleUpload() {
    if (!file) { toast.error('Select a video'); return; }
    if (!file.type || !file.type.startsWith('video/')) { toast.error('Only video files are allowed'); return; }
    setUploading(true);
    setProgress(0);
    try {
      const useMultipart = file.size >= 50 * 1024 * 1024;
      let storageKey: string | null = null;
      if (useMultipart) {
        const res = await multipartUpload({ file, projectId, folder: 'videos', onProgress: (_, __, pct) => setProgress(pct) });
        storageKey = res.key;
      } else {
        const presign = await fetch('/api/uploads/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            folder: 'videos',
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
          }),
        }).then(r => r.json());
        // Use XHR for progress on single PUT
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', presign.url);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.min(100, Math.floor((e.loaded / e.total) * 100));
              setProgress(pct);
            }
          };
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed')));
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.send(file);
        });
        storageKey = presign.key;
      }
      await fetch('/api/project-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          storageKey,
        }),
      }).then(r => { if (!r.ok) throw new Error('Failed to create video record'); });
  toast.success('Uploaded');
  form.reset({ file: null });
  setProgress(0);
      mutate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
  setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiDelete(`/api/project-videos?id=${id}`);
      toast.success('Deleted');
      mutate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const columns: Column<ProjectVideoItem>[] = [
    { key: 'originalName', header: 'Video', accessor: (v) => v.originalName, cellClassName: 'whitespace-nowrap font-medium' },
    { key: 'mimeType', header: 'Type', accessor: (v) => v.mimeType.split('/').pop() || v.mimeType, cellClassName: 'whitespace-nowrap' },
    { key: 'size', header: 'Size', accessor: (v) => formatBytes(v.size), className: 'text-right', cellClassName: 'text-right whitespace-nowrap tabular-nums' },
    { key: 'createdAt', header: 'Uploaded', accessor: (v) => new Date(v.createdAt).toLocaleDateString(), cellClassName: 'whitespace-nowrap' },
  ];

  const content = (
    <div className='space-y-4'>
        {canUpload && (
          <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); handleUpload(); }} className='flex flex-wrap items-end gap-3'>
              <UploadInput
                control={form.control}
                name='file'
                label='Video'
                required
                description='Up to 20GB. Video files only.'
                maxSizeBytes={20 * 1024 * 1024 * 1024}
                accept='video/*'
              />
              <div className='pb-2'>
                <div className='flex items-center gap-3'>
                  <AppButton size='sm' type='submit' disabled={uploading || !file}>
                    {uploading ? `Uploading ${progress}%` : 'Upload'}
                  </AppButton>
                  {uploading ? (
                    <div className='w-48'>
                      <Progress value={progress} />
                    </div>
                  ) : null}
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
          emptyMessage='No videos'
          renderRowActions={(row) => (
            <div className='flex gap-2'>
              <a href={`/api/project-videos/${row.id}/download`} target='_blank' rel='noopener noreferrer'>
                <OpenIconButton size='xs' tooltip='Open Video' aria-label='Open Video' />
              </a>
              {canDelete && (
                <DeleteButton
                  onDelete={() => handleDelete(row.id)}
                  itemLabel='video'
                  title='Delete video?'
                  description={`This will permanently remove the video${row.id ? ` #${row.id}` : ''}. This action cannot be undone.`}
                  confirmText='Delete'
                  cancelText='Cancel'
                  size='xs'
                />
              )}
            </div>
          )}
          actionsHeader=''
        />
    </div>
  );

  if (embedded) return content;
  return (
    <AppCard className='mt-8'>
      <AppCard.Header>
        <AppCard.Title>Videos</AppCard.Title>
        <AppCard.Description>Project videos (S3).</AppCard.Description>
      </AppCard.Header>
      <AppCard.Content className='space-y-4'>{content}</AppCard.Content>
    </AppCard>
  );
}
