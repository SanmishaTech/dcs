import { useState } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Lock } from 'lucide-react';

type PasswordInputProps = {
  control: unknown; // relaxed typing
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoComplete?: string;
  required?: boolean;
};

export function PasswordInput({ control, name, label, description, placeholder, disabled, className, autoComplete = 'current-password', required }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const type = visible ? 'text' : 'password';

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
              <Lock className="h-4 w-4" />
            </div>
            <FormControl>
              <Input
                type={type}
                placeholder={placeholder}
                autoComplete={autoComplete}
                disabled={disabled}
                className={cn('pl-9 pr-10', className)}
                required={required}
                {...field}
              />
            </FormControl>
            <button
              type="button"
              onClick={() => setVisible(v => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition"
              tabIndex={-1}
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
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
