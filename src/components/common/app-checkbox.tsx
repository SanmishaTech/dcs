"use client";

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// Simple wrapper around shadcn Checkbox providing label, description, error.
type AppCheckboxProps = {
  id?: string;
  className?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  disabled?: boolean;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  required?: boolean;
};

export function AppCheckbox({
  id,
  className,
  label,
  description,
  error,
  disabled,
  checked,
  defaultChecked,
  onCheckedChange,
  name,
  required,
}: AppCheckboxProps) {
  const internalId = React.useId();
  const cid = id || internalId;
  const describedBy: string[] = [];
  if (description) describedBy.push(cid + '-desc');
  if (error) describedBy.push(cid + '-err');
  return (
    <div className={cn('flex items-center h-full mt-3', className)}>
      <div className="flex items-center gap-2">
        <Checkbox
          id={cid}
          name={name}
          disabled={disabled}
          checked={checked}
          defaultChecked={defaultChecked}
          onCheckedChange={(v) => onCheckedChange?.(!!v)}
          aria-describedby={describedBy.length ? describedBy.join(' ') : undefined}
          aria-invalid={!!error || undefined}
          required={required}
        />
        {label && (
          <label htmlFor={cid} className="select-none text-sm leading-none peer-disabled:cursor-not-allowed">
            {label}{required ? <span className="ml-0.5 text-destructive">*</span> : null}
          </label>
        )}
      </div>
      {description && !error && (
        <p id={cid + '-desc'} className="text-[11px] text-muted-foreground ml-2">{description}</p>
      )}
      {error && (
        <p id={cid + '-err'} className="text-[11px] text-destructive ml-2">{error}</p>
      )}
    </div>
  );
}
