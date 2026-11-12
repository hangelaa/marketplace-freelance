import Link from "next/link";

type BrandProps = { light?: boolean };

/** The two interlocking strokes are an original, inline Peivand mark. */
export function Brand({ light = false }: BrandProps) {
  return (
    <Link className={`brand${light ? " brand--light" : ""}`} href="/" aria-label="پیوند، صفحه اصلی">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M16 9h-3a8 8 0 0 0 0 16h8a8 8 0 0 0 8-8v-3" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M24 31h3a8 8 0 0 0 0-16h-8a8 8 0 0 0-8 8v3" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" opacity=".55" />
        </svg>
      </span>
      <span className="brand-wordmark">پیوند<span lang="en" dir="ltr">PEYVAND</span></span>
    </Link>
  );
}
