'use client';
import useSWR from 'swr';
import { apiGet } from '@/lib/api-client';
import { AppCard } from '@/components/common/app-card';
import { usePermissions } from '@/hooks/use-permissions';
import { PERMISSIONS } from '@/config/roles';
import { QuickAddUserDialog } from './quick-add-user-dialog';
import { DataTable, Column } from '@/components/common/data-table';
import { toast } from '@/lib/toast';
import { DeleteButton } from '@/components/common/delete-button';

interface MemberItem { id: number; userId: number; user: { id: number; name: string | null; email: string; role: string }; }

export function ProjectMembers({ projectId, embedded = false }: { projectId: number; embedded?: boolean }) {
  const { can } = usePermissions();
  const { data, mutate, isLoading } = useSWR<MemberItem[]>(`/api/projects/${projectId}/users`, apiGet);
  const canManage = can(PERMISSIONS.MANAGE_PROJECT_USERS);

  if (!can(PERMISSIONS.READ_PROJECT)) return null;

  const content = (
    <div className='space-y-3'>
      <div className='flex items-center justify-between gap-2'>
        <div className='font-medium'>Members</div>
        {canManage && <QuickAddUserDialog projectId={projectId} onAdded={() => mutate()} />}
      </div>
      <MembersTable
        members={data || []}
        loading={isLoading}
        canManage={canManage}
        onRemove={async (userId) => {
          try {
            const res = await fetch(`/api/projects/${projectId}/users`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId }),
              credentials: 'include',
            });
            if (!res.ok) {
              const j: unknown = await res.json().catch(() => ({}));
              let msg: string | undefined;
              if (j && typeof j === 'object' && 'message' in j) {
                const m = (j as Record<string, unknown>).message; if (typeof m === 'string') msg = m;
              }
              throw new Error(msg || 'Failed');
            }
            toast.success('Removed');
            mutate();
          } catch (e) { toast.error((e as Error).message); }
        }}
      />
    </div>
  );

  if (embedded) return content;
  return (
    <AppCard className='mt-8'>
      <AppCard.Header>
        <AppCard.Title className='flex items-center gap-3'>
          <span>Members</span>
          {canManage && <QuickAddUserDialog projectId={projectId} onAdded={() => mutate()} />}
        </AppCard.Title>
        <AppCard.Description>Project user memberships.</AppCard.Description>
      </AppCard.Header>
      <AppCard.Content>{content}</AppCard.Content>
    </AppCard>
  );
}

// Internal table component
function MembersTable({ members, loading, canManage, onRemove }: { members: MemberItem[]; loading: boolean; canManage: boolean; onRemove: (userId: number) => void }) {
  const columns: Column<MemberItem>[] = [
    { key: 'name', header: 'Name', accessor: m => m.user.name || '—', sortable: false, cellClassName: 'whitespace-nowrap font-medium' },
    { key: 'email', header: 'Email', accessor: m => m.user.email, sortable: false, cellClassName: 'whitespace-nowrap' },
  ];
  return (
    <DataTable
      columns={columns}
      data={members}
      loading={loading}
      simpleStyle
      emptyMessage='No members'
      renderRowActions={canManage ? (m) => (
        <DeleteButton
          onDelete={() => onRemove(m.userId)}
          itemLabel='member'
          title='Remove member?'
          description={`This will remove user #${m.userId} from the project (account not deleted). Continue?`}
          confirmText='Remove'
          cancelText='Cancel'
          size='xs'
        />
      ) : undefined}
      actionsHeader=''
    />
  );
}
