import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "size-7 rounded-lg", icon: "size-4", text: "text-base" },
  md: { box: "size-9 rounded-xl", icon: "size-5", text: "text-lg" },
  lg: { box: "size-14 rounded-2xl", icon: "size-7", text: "text-3xl" },
} as const;

interface LogoProps {
  size?: keyof typeof SIZES;
  withText?: boolean;
  className?: string;
}

export function Logo({ size = "md", withText = true, className }: LogoProps) {
  const styles = SIZES[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid shrink-0 place-items-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-white shadow-sm",
          styles.box,
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.icon}
        >
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m20 20-4.1-4.1" />
        </svg>
      </span>
      {withText && (
        <span className={cn("font-bold tracking-tight", styles.text)}>Nova</span>
      )}
    </span>
  );
}
