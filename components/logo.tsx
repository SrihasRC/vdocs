export function Logo() {
  return (
    <span className="flex items-center gap-2.5 font-semibold text-[0.9375rem] tracking-tight">
      <svg
        width="20"
        height="20"
        viewBox="0 0 180 180"
        className="size-5 shrink-0"
        aria-hidden="true"
      >
        <circle
          cx="90"
          cy="90"
          r="88"
          fill="url(#vdocs-icon-gradient)"
          stroke="var(--color-fd-primary)"
          strokeWidth="3"
        />
        <defs>
          <linearGradient id="vdocs-icon-gradient" gradientTransform="rotate(45)">
            <stop offset="40%" stopColor="var(--color-fd-background)" />
            <stop offset="100%" stopColor="var(--color-fd-primary)" />
          </linearGradient>
        </defs>
      </svg>
      <span className="font-semibold text-fd-foreground">vdocs</span>
    </span>
  );
}
