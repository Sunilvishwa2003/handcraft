import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", {
  variants: {
    tone: {
      gold: "bg-[rgba(217,177,111,0.18)] text-[var(--admin-gold)]",
      stone: "bg-[rgba(140,133,119,0.18)] text-[var(--admin-stone)]",
      sky: "bg-[rgba(76,149,199,0.16)] text-[var(--admin-sky)]",
      emerald: "bg-[rgba(45,138,102,0.16)] text-[var(--admin-emerald)]",
      rose: "bg-[rgba(244,114,182,0.16)] text-rose-300",
      slate: "bg-white/10 text-[var(--admin-muted)]",
    },
  },
  defaultVariants: {
    tone: "gold",
  },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
