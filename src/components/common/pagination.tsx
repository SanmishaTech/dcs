"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppSelect } from "@/components/common/app-select";
import React from "react";

export type PaginationProps = {
  page: number;
  totalPages: number;
  total?: number;
  perPage?: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (per: number) => void;
  className?: string;
  size?: "sm" | "default" | "lg";
  showPageNumbers?: boolean; // simple toggle for number buttons
  maxButtons?: number; // max numeric buttons when showPageNumbers
  disabled?: boolean;
  compact?: boolean; // icon-only prev/next with tooltip-like labels hidden
  withSummary?: boolean; // wraps in footer layout with summary text
  summaryLabel?: (args: { page: number; totalPages: number; total?: number; perPage?: number }) => React.ReactNode;
};

export function Pagination({
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
  className,
  size = "sm",
  showPageNumbers = false,
  maxButtons = 5,
  disabled = false,
  compact = false,
  withSummary = true,
  summaryLabel,
}: PaginationProps) {
  const perPageOptions = [5, 10, 20, 50];
  const canPrev = page > 1 && !disabled;
  const canNext = page < totalPages && !disabled;

  function go(p: number) {
    if (p < 1 || p > totalPages || p === page) return;
    onPageChange(p);
  }

  const pages: number[] = showPageNumbers
    ? (() => {
        const list: number[] = [];
        const half = Math.floor(maxButtons / 2);
        let start = Math.max(1, page - half);
        let end = start + maxButtons - 1;
        if (end > totalPages) {
          end = totalPages;
          start = Math.max(1, end - maxButtons + 1);
        }
        for (let i = start; i <= end; i++) list.push(i);
        return list;
      })()
    : [];

  const core = (
    <nav
      className={cn("flex items-center gap-2 flex-wrap", !withSummary && className)}
      aria-label="Pagination navigation"
    >
      <Button
        variant="outline"
        size={size}
        disabled={!canPrev}
        onClick={() => go(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        {!compact && <span className="ml-1 hidden md:inline">Prev</span>}
      </Button>
      {showPageNumbers && pages[0] && pages[0] > 1 && (
        <Button
          variant="ghost"
          size={size}
          onClick={() => go(1)}
          disabled={disabled}
        >1</Button>
      )}
      {showPageNumbers && pages[0] && pages[0] > 2 && (
        <span className="px-1 text-muted-foreground">…</span>
      )}
      {showPageNumbers && pages.map(n => (
        <Button
          key={n}
          variant="ghost"
          size={size}
          onClick={() => go(n)}
          disabled={disabled}
          className={cn(
            "transition-colors", 
            n === page
              ? "bg-primary text-primary-foreground hover:bg-primary focus-visible:ring-2 focus-visible:ring-primary/50 font-medium shadow-sm"
              : "hover:bg-muted"
          )}
          aria-current={n === page ? "page" : undefined}
        >{n}</Button>
      ))}
      {showPageNumbers && pages.at(-1) && pages.at(-1)! < totalPages - 1 && (
        <span className="px-1 text-muted-foreground">…</span>
      )}
      {showPageNumbers && pages.at(-1) && pages.at(-1)! < totalPages && (
        <Button
          variant="ghost"
          size={size}
          onClick={() => go(totalPages)}
          disabled={disabled}
        >{totalPages}</Button>
      )}
      <Button
        variant="outline"
        size={size}
        disabled={!canNext}
        onClick={() => go(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
        {!compact && <span className="ml-1 hidden md:inline">Next</span>}
      </Button>
  {!compact && !withSummary && (
        <div className="ml-2 hidden sm:block text-xs text-muted-foreground whitespace-nowrap">
          Page {page} / {totalPages || 1}
          {typeof total === "number" && perPage ? ` · ${total} items` : ""}
        </div>
      )}
      {onPerPageChange && !compact && (
        <div className="ml-2 flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Rows:</span>
          <div className="min-w-[70px]">
            <AppSelect
              value={String(perPage)}
              onValueChange={(v) => onPerPageChange(Number(v))}
              triggerClassName="h-7 w-[70px] px-2 text-xs"
              disabled={disabled}
            >
              {perPageOptions.map(opt => (
                <AppSelect.Item key={opt} value={String(opt)}>{opt}</AppSelect.Item>
              ))}
            </AppSelect>
          </div>
        </div>
      )}
    </nav>
  );

  if (!withSummary) return core;

  const label = summaryLabel
    ? summaryLabel({ page, totalPages, total, perPage })
    : (
      <div className="text-xs text-muted-foreground order-2 sm:order-1">
        Showing page {page} of {totalPages || 1} {typeof total === 'number' && `· ${total} items`}
      </div>
    );

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm", className)}>
      {label}
      <div className="order-1 sm:order-2">{core}</div>
    </div>
  );
}
