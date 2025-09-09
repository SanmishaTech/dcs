"use client";
import { useParams } from 'next/navigation';
import { useRef } from 'react';
import useSWR from 'swr';
import { apiGet } from '@/lib/api-client';
import { AppCard } from '@/components/common/app-card';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ProjectCracks, type ProjectCracksHandle } from '../edit/project-cracks';
import { ImportCracksDialog } from './import-cracks-dialog';

interface ProjectDetail { id: number; name: string }

export default function ProjectCracksPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { data, error, isLoading } = useSWR<ProjectDetail>(projectId ? `/api/projects/${projectId}` : null, apiGet);
  const cracksRef = useRef<ProjectCracksHandle | null>(null);

  if (!projectId) return <div className="p-6">Invalid project id</div>;
  if (error) return <div className="p-6 text-destructive">Failed to load project</div>;

  return (
    <AppCard className="mt-4">
      <AppCard.Header>
        <AppCard.Title>Crack Identifications - {data?.name || '...'}</AppCard.Title>
        <AppCard.Description>Imported crack data for this project.</AppCard.Description>
        <AppCard.Action>
          <ImportCracksDialog projectId={projectId} onImported={() => cracksRef.current?.reload()} />
          <Link
            href={`/projects/${projectId}/design`}
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            Go to Design
          </Link>
        </AppCard.Action>
      </AppCard.Header>
      <AppCard.Content>
        {isLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
        {!isLoading && <ProjectCracks ref={cracksRef} projectId={projectId} embedded />}
      </AppCard.Content>
    </AppCard>
  );
}
