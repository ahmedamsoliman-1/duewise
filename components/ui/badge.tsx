import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-panel text-ink/70 border-line",
  brand: "bg-brand-soft text-brand-strong border-brand/20",
  success: "bg-emerald-500/12 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
  warning: "bg-amber-500/14 text-amber-700 border-amber-500/25 dark:text-amber-300",
  danger: "bg-red-500/12 text-red-700 border-red-500/25 dark:text-red-300"
};

export function Badge({
  tone = "neutral",
  className,
  children
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Maps common duewise status strings to a badge tone. */
export function statusTone(status: string): Tone {
  const value = status.toLowerCase();
  if (value.includes("overdue") || value.includes("expired")) return "danger";
  if (value.includes("due") || value.includes("soon") || value.includes("pending")) return "warning";
  if (value.includes("complete") || value.includes("done") || value.includes("active") || value.includes("paid"))
    return "success";
  return "neutral";
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-line/70", className)} />;
}
