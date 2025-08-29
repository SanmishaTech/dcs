'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { AppCard } from '@/components/common/app-card';
import { TextInput } from '@/components/common/text-input';
import { AppButton } from '@/components/common/app-button';
import { FormSection, FormRow } from '@/components/common/app-form';
import { apiPost, apiPatch } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';

export interface ProjectFormInitialData {
  id?: number;
  name?: string;
  clientName?: string;
  location?: string | null;
  description?: string | null;
}

export interface ProjectFormProps {
  mode: 'create' | 'edit';
  initial?: ProjectFormInitialData | null;
  onSuccess?: (result?: unknown) => void;
  redirectOnSuccess?: string; // default '/projects'
}

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  clientName: z.string().min(2, 'Client name required'),
  location: z.string().optional(),
  description: z.string().optional(),
});

export default function ProjectForm({ mode, initial, onSuccess, redirectOnSuccess = '/projects' }: ProjectFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isCreate = mode === 'create';

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: initial?.name || '',
      clientName: initial?.clientName || '',
      location: initial?.location || '',
      description: initial?.description || '',
    },
  });
  const { control, handleSubmit } = form;

  async function onSubmit(values: z.infer<typeof schema>) {
    setSubmitting(true);
    try {
      if (isCreate) {
        const res = await apiPost('/api/projects', {
          name: values.name,
          clientName: values.clientName,
          location: values.location || null,
          description: values.description || null,
        });
        toast.success('Project created');
        onSuccess?.(res);
      } else if (initial?.id) {
        const res = await apiPatch(`/api/projects/${initial.id}`, {
          name: values.name,
          clientName: values.clientName,
          location: values.location || null,
          description: values.description || null,
        });
        toast.success('Project updated');
        onSuccess?.(res);
      }
      router.push(redirectOnSuccess);
    } catch (e) {
      toast.error((e as Error).message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <AppCard>
        <AppCard.Header>
          <AppCard.Title>{isCreate ? 'Create Project' : 'Edit Project'}</AppCard.Title>
          <AppCard.Description>
            {isCreate ? 'Register a new project.' : 'Update project details.'}
          </AppCard.Description>
        </AppCard.Header>
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <AppCard.Content>
            <FormSection legend='Project Information'>
              <FormRow cols={1}>
                <TextInput control={control} name='name' label='Project Name' required placeholder='e.g. Alpha Initiative' />
              </FormRow>
              <FormRow cols={12} from='md'>
                <TextInput span={8} spanFrom='md' control={control} name='clientName' label='Client Name' required placeholder='e.g. ACME Corp' />
                <TextInput span={4} spanFrom='md' control={control} name='location' label='Location' placeholder='City / Region' />
              </FormRow>
              <FormRow cols={1}>
                <TextInput control={control} name='description' label='Short Description' placeholder='Optional brief summary' />
              </FormRow>
            </FormSection>
          </AppCard.Content>
          <AppCard.Footer className='justify-end'>
            <AppButton type='button' variant='secondary' onClick={() => router.push(redirectOnSuccess)} disabled={submitting} iconName='X'>Cancel</AppButton>
            <AppButton type='submit' iconName={isCreate ? 'Plus' : 'Save'} isLoading={submitting} disabled={submitting || !form.formState.isValid}>
              {isCreate ? 'Create Project' : 'Save Changes'}
            </AppButton>
          </AppCard.Footer>
        </form>
      </AppCard>
    </Form>
  );
}
