import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "size-7 rounded-md", icon: "size-4", text: "text-[15px]" },
  md: { box: "size-9 rounded-lg", icon: "size-5", text: "text-lg" },
  lg: { box: "size-12 rounded-xl", icon: "size-6", text: "text-2xl" },
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
          "grid shrink-0 place-items-center bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.12)]",
          styles.box,
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          className={styles.icon}
        >
          <path d="M4.5 5.5v13" />
          <path d="M9 7h10.5" />
          <path d="M9 12h7.5" />
          <path d="M9 17h4.5" />
        </svg>
      </span>
      {withText && (
        <span
          className={cn(
            "font-semibold tracking-[-0.02em] text-foreground",
            styles.text,
          )}
        >
          Index
        </span>
      )}
    </span>
  );
}
