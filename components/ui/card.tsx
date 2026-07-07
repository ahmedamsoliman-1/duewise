import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-lg border border-ink/10 bg-white p-5 shadow-soft", className)}>{children}</section>;
}
