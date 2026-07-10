import { cn } from "@/lib/utils";

type CardProps = {
  className?: string;
  children: React.ReactNode;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLElement>) => void;
};

export function Card({ className, children, draggable, onDragStart, onDragOver, onDrop }: CardProps) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6",
        className
      )}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {children}
    </section>
  );
}

type CardHeaderProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function CardHeader({ icon, title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn("mb-5 flex min-w-0 items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
