import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-gold)]/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[linear-gradient(135deg,rgba(233,190,119,0.95),rgba(156,101,60,0.92))] px-4 py-2.5 text-stone-950 shadow-[0_18px_40px_rgba(157,108,64,0.28)] hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(157,108,64,0.32)]",
        secondary: "border border-[var(--admin-border)] bg-white/8 px-4 py-2.5 text-[var(--admin-foreground)] hover:bg-white/12",
        ghost: "px-3 py-2 text-[var(--admin-muted)] hover:bg-white/8 hover:text-[var(--admin-foreground)]",
        outline: "border border-[var(--admin-border)] bg-transparent px-4 py-2.5 text-[var(--admin-foreground)] hover:border-[rgba(217,177,111,0.45)] hover:bg-[rgba(217,177,111,0.08)]",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-4",
        lg: "h-12 px-5 text-sm",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));

Button.displayName = "Button";

export { Button, buttonVariants };
