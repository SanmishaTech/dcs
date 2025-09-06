"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

// Lightweight, common Combobox wrapper using shadcn primitives.
// - Single-select
// - Optional RHF integration via { control, name }
// - Works with string | number values (internally coerced to string)

export type ComboOption = {
  value: string | number;
  label: React.ReactNode;
  disabled?: boolean;
};

type BaseProps = {
  options: ComboOption[];
  value?: string | number | null;
  onValueChange?: (v: string | number | null) => void;
  placeholder?: React.ReactNode;
  searchPlaceholder?: string;
  emptyText?: React.ReactNode;
  label?: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  // Optional custom renderer for selected display
  renderDisplay?: (opt: ComboOption | undefined) => React.ReactNode;
  // RHF
  control?: unknown; // relaxed typing to avoid generics noise
  name?: string;
};

function toKey(v: string | number | null | undefined) {
  return v == null ? "" : String(v);
}

function getByValue(options: ComboOption[], v: string | number | null | undefined) {
  const sk = toKey(v);
  return options.find(o => String(o.value) === sk);
}

function BaseCombobox(props: BaseProps) {
  const {
    options,
    value,
    onValueChange,
    placeholder = "Select",
    searchPlaceholder = "Search...",
    emptyText = "No results",
    label,
    description,
    required,
    disabled,
    allowClear = true,
    className,
    triggerClassName,
    contentClassName,
    renderDisplay,
  } = props;

  const [open, setOpen] = React.useState(false);
  const selected = getByValue(options, value);

  const handleSelect = (val: string) => {
    const opt = options.find(o => String(o.value) === val);
    if (!opt) return;
    onValueChange?.(opt.value);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.(null);
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <FormLabel>
          {label}
          {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        </FormLabel>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("w-full justify-between", triggerClassName)}
          >
            <span className={cn(!selected && "text-muted-foreground")}>
              {selected ? (renderDisplay ? renderDisplay(selected) : selected.label) : placeholder}
            </span>
            <span className="flex items-center gap-1">
              {allowClear && selected && !disabled ? (
                <X
                  className="size-4 text-muted-foreground hover:text-foreground"
                  onClick={handleClear}
                />
              ) : null}
              <ChevronsUpDown className="ml-2 size-4 opacity-50" />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn("p-0", contentClassName)} align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={String(opt.value)}
                    value={String(opt.value)}
                    disabled={opt.disabled}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        String(opt.value) === toKey(value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="min-w-0 truncate">{opt.label}</div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}

// RHF-aware wrapper: if control+name provided, bind to form; stores string value internally
export function AppCombobox(props: BaseProps) {
  const { control, name, options, required, disabled, ...rest } = props;
  if (control && name) {
    return (
      <FormField
        // @ts-expect-error: relaxed RHF typing
        control={control}
        name={name}
        render={({ field }) => {
          // field.value is unknown -> coerce to string|number|null for our base
          const current = field.value as string | number | null | undefined;
          const handleChange = (v: string | number | null) => {
            // Store as string in RHF to avoid numeric edge cases
            field.onChange(v == null ? "" : String(v));
          };
          const valueForBase = current == null || current === "" ? null : current;
          return (
            <FormItem>
              <FormControl>
                <BaseCombobox
                  options={options}
                  value={valueForBase}
                  onValueChange={handleChange}
                  disabled={disabled}
                  required={required}
                  {...rest}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  }
  return <BaseCombobox options={options} disabled={disabled} required={required} {...rest} />;
}

export default AppCombobox;
