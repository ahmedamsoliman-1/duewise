"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type DuewiseMarkProps = {
  className?: string;
};

/**
 * Duewise concept mark: a checkmark completing a clock/progress ring —
 * "what's due, done in time." Amber gradient badge.
 */
export function DuewiseMark({ className }: DuewiseMarkProps) {
  const uid = useId().replace(/:/g, "");
  const badgeId = `dw-badge-${uid}`;
  const sheenId = `dw-sheen-${uid}`;
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label="Duewise" className={cn("h-11 w-11", className)}>
      <defs>
        <linearGradient id={badgeId} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F97316" />
          <stop offset="1" stopColor="#EA8C14" />
        </linearGradient>
        <linearGradient id={sheenId} x1="10" y1="6" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Badge */}
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill={`url(#${badgeId})`} />
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill={`url(#${sheenId})`} />
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="13"
        fill="none"
        stroke="#000000"
        strokeOpacity="0.06"
      />

      {/* Clock / progress ring, near-complete with a gap at the top-right */}
      <path
        d="M24 11.5a12.5 12.5 0 1 1 -8.9 3.7"
        fill="none"
        stroke="#FFF8EF"
        strokeWidth="3.4"
        strokeLinecap="round"
      />

      {/* Checkmark */}
      <path
        d="M17 24.4l4.7 4.8L31.8 18.6"
        fill="none"
        stroke="#FFF8EF"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type DuewiseLogoProps = {
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  markClassName?: string;
};

export function DuewiseLogo({
  showWordmark = true,
  showTagline = true,
  className,
  markClassName
}: DuewiseLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <DuewiseMark className={cn("h-10 w-10 drop-shadow-[0_6px_14px_rgba(234,140,20,0.35)]", markClassName)} />
      {showWordmark && (
        <span className="leading-none">
          <span className="block font-display text-xl font-bold tracking-tight text-ink">Duewise</span>
          {showTagline && (
            <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Ahead of every due date
            </span>
          )}
        </span>
      )}
    </span>
  );
}
