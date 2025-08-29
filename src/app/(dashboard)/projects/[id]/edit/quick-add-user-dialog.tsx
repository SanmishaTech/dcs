'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { TextInput } from '@/components/common/text-input';
import { EmailInput, PasswordInput, AppButton } from '@/components/common';
import { apiPost } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { ROLES, PERMISSIONS } from '@/config/roles';
import { usePermissions } from '@/hooks/use-permissions';

// Quick create user + auto-add to project membership.
// Only visible if user can manage project users.

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 chars'),
});

type FormValues = z.infer<typeof schema>;

export function QuickAddUserDialog({ projectId, onAdded }: { projectId: number; onAdded: () => void }) {
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onChange', defaultValues: { name: '', email: '', password: '' } });
  const { control, handleSubmit } = form;
  if (!can(PERMISSIONS.MANAGE_PROJECT_USERS)) return null;

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      // create user
      const created = await apiPost<{ id: number }>( '/api/users', {
        name: values.name,
        email: values.email,
        password: values.password,
        role: ROLES.PROJECT_USER,
        status: true,
      });
      // add membership
      await apiPost(`/api/projects/${projectId}/users`, { userId: created.id });
      toast.success('User created & added');
      setOpen(false);
      form.reset();
      onAdded();
    } catch (e) {
      toast.error((e as Error).message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <AppButton size='sm' type='button' iconName='Plus'>New User</AppButton>
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>New User</DialogTitle>
          <DialogDescription>Create a user and add to project.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className='space-y-4' onSubmit={handleSubmit(onSubmit)}>
            <TextInput control={control} name='name' label='Name' required placeholder='Full name' />
            <EmailInput control={control} name='email' label='Email' required placeholder='user@example.com' />
            <PasswordInput control={control} name='password' label='Password' required placeholder='Secret password' />
            <DialogFooter className='sm:justify-end'>
              <AppButton type='button' variant='secondary' onClick={() => setOpen(false)} disabled={loading}>Cancel</AppButton>
              <AppButton type='submit' iconName='Plus' disabled={!form.formState.isValid || loading} isLoading={loading}>Create & Add</AppButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
