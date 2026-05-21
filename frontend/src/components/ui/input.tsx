import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-full border border-[var(--admin-border)] bg-white/8 px-4 text-sm text-[var(--admin-foreground)] outline-none transition placeholder:text-[var(--admin-muted)] focus:border-[rgba(217,177,111,0.42)] focus:bg-white/12",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";

export { Input };
