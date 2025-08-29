"use client";
import { useParams } from 'next/navigation';
import { ProjectCracks } from '../edit/project-cracks';

export default function ProjectCracksPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  if (!projectId) return <div className="p-6">Invalid project id</div>;
  return <ProjectCracks projectId={projectId} />;
}
