'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// Temporary redirect to /projects/[id]/edit until a detail view is implemented.
export default function ProjectRedirectPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  useEffect(() => { if (id) router.replace(`/projects/${id}/edit`); }, [id, router]);
  return <div className='p-6 text-sm text-muted-foreground'>Redirecting…</div>;
}
