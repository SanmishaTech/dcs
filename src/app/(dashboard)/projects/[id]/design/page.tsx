"use client";
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import Image from 'next/image';
import { apiGet } from '@/lib/api-client';
import { AppCard } from '@/components/common/app-card';

interface ProjectDetail { id: number; name: string; designImage?: string | null; }

export default function ProjectDesignPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { data, error, isLoading } = useSWR<ProjectDetail>(projectId ? `/api/projects/${projectId}` : null, apiGet);
  if (!projectId) return <div className='p-6'>Invalid project id</div>;
  if (error) return <div className='p-6 text-destructive'>Failed to load project</div>;
  return (
    <AppCard className='mt-4'>
      <AppCard.Header>
        <AppCard.Title>Design - {data?.name || '...'}</AppCard.Title>
        <AppCard.Description>Project design image preview.</AppCard.Description>
      </AppCard.Header>
      <AppCard.Content>
        {isLoading && <div className='text-sm text-muted-foreground'>Loading...</div>}
        {!isLoading && !data?.designImage && <div className='text-sm text-muted-foreground'>No design image uploaded.</div>}
        {data?.designImage && (
          <div className='relative max-w-xl w-full aspect-video border rounded bg-muted/30'>
            <Image
              src={`/uploads/projects/${projectId}/designs/${data.designImage}`}
              alt='Design image'
              fill
              className='object-contain'
            />
          </div>
        )}
      </AppCard.Content>
    </AppCard>
  );
}
