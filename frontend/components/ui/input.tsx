import * as React from "react";
import { cn } from "@/lib/utils";
// shadcn/ui open-code Input with RTL-aware logical padding.
export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn("flex h-13 w-full min-w-0 rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/15 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/15", className)} {...props} />;
}
