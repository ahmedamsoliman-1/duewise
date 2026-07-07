import { cn } from "@/lib/utils";

type DuewiseLogoProps = {
  showWordmark?: boolean;
  className?: string;
  markClassName?: string;
};

export function DuewiseLogo({ showWordmark = true, className, markClassName }: DuewiseLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink text-white shadow-soft dark:bg-[#17201c]",
          markClassName
        )}
        aria-hidden="true"
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(219,233,238,0.9),transparent_34%),linear-gradient(135deg,rgba(73,104,90,0),rgba(166,95,61,0.72))]" />
        <svg viewBox="0 0 44 44" className="relative h-8 w-8" role="img">
          <path d="M12 10h11.5c7.1 0 12.5 5.1 12.5 12s-5.4 12-12.5 12H12V10Z" fill="none" stroke="currentColor" strokeWidth="4.4" strokeLinejoin="round" />
          <path d="M19 18h4.6c2.7 0 4.9 1.7 4.9 4s-2.2 4-4.9 4H19v-8Z" fill="currentColor" />
          <path d="M8 30h8" stroke="currentColor" strokeWidth="4.4" strokeLinecap="round" />
        </svg>
      </span>
      {showWordmark && (
        <span className="leading-tight">
          <span className="block text-lg font-semibold tracking-normal text-ink">Duewise</span>
          <span className="block text-xs font-medium text-ink/55">Life admin command center</span>
        </span>
      )}
    </span>
  );
}
