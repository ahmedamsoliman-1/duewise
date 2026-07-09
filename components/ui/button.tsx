import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-55 active:translate-y-px";

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-11 w-11"
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-brand-gradient text-white shadow-glow hover:brightness-105 hover:shadow-[0_16px_40px_-12px_rgba(234,140,20,0.65)]",
  secondary:
    "border border-line bg-surface text-ink hover:bg-panel hover:border-line/80",
  ghost: "text-ink/80 hover:bg-ink/[0.06] hover:text-ink",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-[0_12px_30px_-14px_rgba(220,38,38,0.7)]"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    />
  );
});
