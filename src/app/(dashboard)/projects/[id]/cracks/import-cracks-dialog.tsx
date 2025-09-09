'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { AppButton } from '@/components/common/app-button';
import { UploadInput } from '@/components/common/upload-input';
import { apiUpload } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { usePermissions } from '@/hooks/use-permissions';
import { PERMISSIONS } from '@/config/roles';

const schema = z.object({
  file: z.custom<File>((v) => v instanceof File, { message: 'File required' }),
});

type FormValues = z.infer<typeof schema>;

export function ImportCracksDialog({ projectId, onImported }: { projectId: number; onImported?: () => void }) {
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onChange', defaultValues: { file: undefined as unknown as File } });
  const { control, handleSubmit } = form;

  if (!can(PERMISSIONS.IMPORT_CRACKS)) return null;

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set('file', values.file);
      const res = await apiUpload<{ imported: number; deleted: number; errors?: { row: number; error: string }[] }>(`/api/cracks?projectId=${projectId}`, fd, { method: 'POST' });
      const errCount = res.errors?.length || 0;
      toast.success(`Imported ${res.imported} rows. Replaced ${res.deleted}. ${errCount ? errCount + ' errors' : ''}`.trim());
      setOpen(false);
      form.reset();
      onImported?.();
    } catch (e) {
      toast.error((e as Error).message || 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <AppButton size="sm" type="button" iconName="Upload">Import Excel</AppButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Crack Data</DialogTitle>
          <DialogDescription>
            Upload an Excel/CSV file. Existing crack data for this project will be replaced.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <UploadInput
              control={control}
              name="file"
              label="Spreadsheet file"
              description="Accepted: .xlsx, .xls, .csv"
              accept=".xlsx,.xls,.csv"
              required
            />
            <DialogFooter className="sm:justify-end">
              <AppButton type="button" variant="secondary" onClick={() => setOpen(false)} disabled={loading}>Cancel</AppButton>
              <AppButton type="submit" iconName="Upload" disabled={!form.formState.isValid || loading} isLoading={loading}>Import</AppButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default ImportCracksDialog;
