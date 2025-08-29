import { cn } from '@/lib/utils';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export interface TextInputProps {
  control: unknown; // relaxed typing
  name: string;
  label: string;
  type?: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
  required?: boolean;
  prefixIcon?: React.ReactNode;
  /** Optional class for the outer FormItem wrapper (useful for grid spans) */
  itemClassName?: string;
}

export function TextInput({ control, name, label, type='text', description, placeholder, disabled, autoComplete, className, required, prefixIcon, itemClassName }: TextInputProps) {
  return (
    <FormField
      // @ts-expect-error relaxed typing for generic use
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={itemClassName}>
          <FormLabel>
            {label}
            {required ? <span className='ml-0.5 text-destructive'>*</span> : null}
          </FormLabel>
          <div className='relative'>
            {prefixIcon && (
              <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground'>
                {prefixIcon}
              </div>
            )}
            <FormControl>
              <Input
                type={type}
                placeholder={placeholder}
                autoComplete={autoComplete}
                disabled={disabled}
                className={cn(prefixIcon && 'pl-9', className)}
                required={required}
                {...field}
              />
            </FormControl>
          </div>
          {description ? (
            <p className='text-xs text-muted-foreground mt-1'>{description}</p>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
