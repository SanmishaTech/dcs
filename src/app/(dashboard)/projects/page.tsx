'use client';

import useSWR from 'swr';
import { useMemo, useState, useEffect } from 'react';
import { apiGet, apiDelete } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { Pagination } from '@/components/common/pagination';
import { NonFormTextInput } from '@/components/common/non-form-text-input';
import { FilterBar } from '@/components/common';
import { AppCard } from '@/components/common/app-card';
import { AppButton } from '@/components/common/app-button';
import { DataTable, SortState, Column } from '@/components/common/data-table';
import { usePermissions } from '@/hooks/use-permissions';
import { useQueryParamsState } from '@/hooks/use-query-params-state';
import { PERMISSIONS } from '@/config/roles';
import Link from 'next/link';
import { EditButton } from '@/components/common/icon-button';
import { DeleteButton } from '@/components/common/delete-button';

interface ProjectListItem {
  id: number;
  name: string;
  clientName: string;
  location: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { users: number; files: number };
}

interface ProjectsResponse {
  data: ProjectListItem[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export default function ProjectsPage() {
  const [qp, setQp] = useQueryParamsState({
    page: 1,
    perPage: 10,
    search: '',
    sort: 'createdAt',
    order: 'desc',
  });
  const { page, perPage, search, sort, order } = qp as unknown as { page: number; perPage: number; search: string; sort: string; order: 'asc' | 'desc' };

  const [searchDraft, setSearchDraft] = useState(search);
  useEffect(() => { setSearchDraft(search); }, [search]);
  const filtersDirty = searchDraft !== search;
  function applyFilters() { setQp({ page: 1, search: searchDraft.trim() }); }
  function resetFilters() { setSearchDraft(''); setQp({ page: 1, search: '' }); }

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(page));
    sp.set('perPage', String(perPage));
    if (search) sp.set('search', search);
    if (sort) sp.set('sort', sort);
    if (order) sp.set('order', order);
    return `/api/projects?${sp.toString()}`;
  }, [page, perPage, search, sort, order]);

  const { data, error, isLoading, mutate } = useSWR<ProjectsResponse>(query, apiGet);
  const { can } = usePermissions();

  if (error) toast.error((error as Error).message || 'Failed to load projects');

  function toggleSort(field: string) {
    if (sort === field) setQp({ order: order === 'asc' ? 'desc' : 'asc' }); else setQp({ sort: field, order: 'asc' });
  }

  const columns: Column<ProjectListItem>[] = [
    { key: 'name', header: 'Name', sortable: true, cellClassName: 'font-medium whitespace-nowrap' },
    { key: 'clientName', header: 'Client', sortable: true, cellClassName: 'whitespace-nowrap' },
    { key: 'location', header: 'Location', sortable: true, accessor: r => r.location || '—', cellClassName: 'whitespace-nowrap' },
    { key: '_count.users', header: 'Users', accessor: r => r._count.users, className: 'text-right', cellClassName: 'text-right tabular-nums', sortable: false },
    { key: '_count.files', header: 'Files', accessor: r => r._count.files, className: 'text-right', cellClassName: 'text-right tabular-nums', sortable: false },
    { key: 'createdAt', header: 'Created', sortable: true, accessor: r => new Date(r.createdAt).toLocaleDateString(), className: 'whitespace-nowrap', cellClassName: 'text-muted-foreground whitespace-nowrap' },
  ];

  const sortState: SortState = { field: sort, order };

  async function handleDelete(id: number) {
    try {
      await apiDelete(`/api/projects/${id}`);
      toast.success('Project deleted');
      await mutate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <AppCard>
      <AppCard.Header>
        <AppCard.Title>Projects</AppCard.Title>
        <AppCard.Description>Browse projects.</AppCard.Description>
        {can(PERMISSIONS.CREATE_PROJECT) && (
          <AppCard.Action>
            <Link href='/projects/new'>
              <AppButton size='sm' iconName='Plus' type='button'>New</AppButton>
            </Link>
          </AppCard.Action>
        )}
      </AppCard.Header>
      <AppCard.Content>
        <FilterBar title='Search'>
          <NonFormTextInput
            aria-label='Search projects'
            placeholder='Search projects...'
            value={searchDraft}
            onChange={e => setSearchDraft(e.target.value)}
            containerClassName='w-full'
          />
          <AppButton size='sm' onClick={applyFilters} disabled={!filtersDirty && !searchDraft} className='min-w-[84px]'>Filter</AppButton>
          {search && (
            <AppButton variant='secondary' size='sm' onClick={resetFilters} className='min-w-[84px]'>Reset</AppButton>
          )}
        </FilterBar>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          sort={sortState}
          onSortChange={s => toggleSort(s.field)}
          stickyColumns={1}
          renderRowActions={p => {
            if (!can(PERMISSIONS.UPDATE_PROJECT) && !can(PERMISSIONS.DELETE_PROJECT)) return null;
            return (
              <div className='flex'>
                {can(PERMISSIONS.UPDATE_PROJECT) && (
                  <Link href={`/projects/${p.id}/edit`}> <EditButton tooltip='Edit Project' aria-label='Edit Project' /> </Link>
                )}
                {can(PERMISSIONS.DELETE_PROJECT) && (
                  <DeleteButton
                    onDelete={() => handleDelete(p.id)}
                    itemLabel='project'
                    title='Delete project?'
                    description={`This will permanently remove project #${p.id}. This action cannot be undone.`}
                  />
                )}
              </div>
            );
          }}
        />
      </AppCard.Content>
      <AppCard.Footer className='justify-end'>
        <Pagination
          page={data?.page || page}
          totalPages={data?.totalPages || 1}
          total={data?.total}
          perPage={perPage}
          onPerPageChange={val => setQp({ page: 1, perPage: val })}
          onPageChange={p => setQp({ page: p })}
          showPageNumbers
          maxButtons={5}
          disabled={isLoading}
        />
      </AppCard.Footer>
    </AppCard>
  );
}
