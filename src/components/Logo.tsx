const SPOKES = Array.from({ length: 7 }, (_, i) => (i * 360) / 7);

/** A ship's helm with seven spokes — a nod to Kubernetes (Greek for "helmsman"). */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="logo">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f86f0" />
          <stop offset="1" stopColor="#2251c9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-g)" />
      <g className="logo-wheel" fill="none" stroke="#fff" strokeLinecap="round">
        <circle cx="32" cy="32" r="12.5" strokeWidth="4" />
        {SPOKES.map((a) => (
          <g key={a} transform={`rotate(${a} 32 32)`}>
            <path d="M32 26.5V9.5" strokeWidth="3.6" />
            <circle cx="32" cy="9" r="2.6" fill="#fff" stroke="none" />
          </g>
        ))}
        <circle cx="32" cy="32" r="4.2" fill="#fff" stroke="none" />
      </g>
    </svg>
  );
}
