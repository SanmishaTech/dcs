import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type EmailInputProps = {
  control: unknown; // relaxed typing to avoid strict RHF generics
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
  required?: boolean;
};

export function EmailInput({ control, name, label, description, placeholder, disabled, autoComplete = 'email', className, required }: EmailInputProps) {
  return (
    <FormField
      // @ts-expect-error relaxed typing
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required ? <span className="ml-0.5 text-destructive">*</span> : null}
          </FormLabel>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Mail className="h-4 w-4" />
            </div>
            <FormControl>
              <Input
                type="email"
                placeholder={placeholder}
                autoComplete={autoComplete}
                disabled={disabled}
                className={cn('pl-9', className)}
                required={required}
                {...field}
              />
            </FormControl>
          </div>
          {description ? (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
