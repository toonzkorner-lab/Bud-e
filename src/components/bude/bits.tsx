import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Chip({
  on,
  children,
  onClick,
}: {
  on: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-3.5 text-sm font-medium transition-colors",
        on ? "border-accent bg-accent text-accent-ink" : "border-line bg-card text-fg hover:bg-card-2",
      )}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-sm font-semibold text-fg">{children}</p>;
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border border-line bg-card p-4", className)}>{children}</section>
  );
}
