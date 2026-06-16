/**
 * The Splitplata wordmark: a split-coin mark plus the two-tone name —
 * "Split" + "plata" (plata = silver/money). Colours come from CSS variables so
 * the mark and word stay legible in both light and dark mode.
 */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="logo">
      <svg
        className="logo-mark"
        width={size}
        height={size}
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        <path d="M15 2 a14 14 0 0 0 0 28 Z" />
        <path className="logo-mark-2" d="M17 2 a14 14 0 0 1 0 28 Z" />
      </svg>
      <span className="logo-word">
        <span className="logo-split">Split</span>
        <span className="logo-plata">plata</span>
      </span>
    </span>
  );
}
