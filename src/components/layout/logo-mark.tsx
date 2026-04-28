export function LogoMark({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 145" fill="none" className={className} aria-hidden="true">
      {/* Moon arc */}
      <path d="M112,14 A60,60 0 0,1 112,131" stroke="#585858" strokeWidth="5" strokeLinecap="round" />

      {/* Pixel building — 4 cols × 9 rows, 10px squares, 2px gap (pitch=12) */}
      {/* Rows 0–3 (bottom): all 4 cols solid */}
      <rect x="8" y="108" width="10" height="10" fill="#E24A43" />
      <rect x="20" y="108" width="10" height="10" fill="#E24A43" />
      <rect x="32" y="108" width="10" height="10" fill="#E24A43" />
      <rect x="44" y="108" width="10" height="10" fill="#E24A43" />

      <rect x="8" y="96" width="10" height="10" fill="#E24A43" />
      <rect x="20" y="96" width="10" height="10" fill="#E24A43" />
      <rect x="32" y="96" width="10" height="10" fill="#E24A43" />
      <rect x="44" y="96" width="10" height="10" fill="#E24A43" />

      <rect x="8" y="84" width="10" height="10" fill="#E24A43" />
      <rect x="20" y="84" width="10" height="10" fill="#E24A43" />
      <rect x="32" y="84" width="10" height="10" fill="#E24A43" />
      <rect x="44" y="84" width="10" height="10" fill="#E24A43" />

      <rect x="8" y="72" width="10" height="10" fill="#E24A43" />
      <rect x="20" y="72" width="10" height="10" fill="#E24A43" />
      <rect x="32" y="72" width="10" height="10" fill="#E24A43" />
      <rect x="44" y="72" width="10" height="10" fill="#E24A43" />

      {/* Row 4: cols 0–2 solid, col 3 starts drifting */}
      <rect x="8" y="60" width="10" height="10" fill="#E24A43" />
      <rect x="20" y="60" width="10" height="10" fill="#E24A43" />
      <rect x="32" y="60" width="10" height="10" fill="#E24A43" />
      <rect x="48" y="57" width="10" height="10" fill="#E24A43" opacity="0.9" />

      {/* Row 5: cols 0–1 solid, scatter right */}
      <rect x="8" y="48" width="10" height="10" fill="#E24A43" />
      <rect x="20" y="48" width="10" height="10" fill="#E24A43" />
      <rect x="36" y="44" width="9" height="9" fill="#E24A43" opacity="0.78" />
      <rect x="52" y="39" width="8" height="8" fill="#E24A43" opacity="0.55" />

      {/* Row 6: col 0 solid, scatter */}
      <rect x="8" y="36" width="10" height="10" fill="#E24A43" />
      <rect x="25" y="32" width="9" height="9" fill="#E24A43" opacity="0.82" />
      <rect x="42" y="26" width="8" height="8" fill="#E24A43" opacity="0.58" />
      <rect x="60" y="22" width="7" height="7" fill="#E24A43" opacity="0.38" />

      {/* Row 7: col 0 solid, scatter */}
      <rect x="8" y="24" width="10" height="10" fill="#E24A43" />
      <rect x="24" y="18" width="8" height="8" fill="#E24A43" opacity="0.68" />
      <rect x="42" y="13" width="7" height="7" fill="#E24A43" opacity="0.46" />
      <rect x="60" y="17" width="6" height="6" fill="#E24A43" opacity="0.28" />

      {/* Row 8 (top): col 0 + tiny scatter */}
      <rect x="8" y="12" width="10" height="10" fill="#E24A43" />
      <rect x="24" y="6" width="7" height="7" fill="#E24A43" opacity="0.55" />
      <rect x="40" y="3" width="6" height="6" fill="#E24A43" opacity="0.35" />
      <rect x="57" y="7" width="5" height="5" fill="#E24A43" opacity="0.2" />

      {/* Mountain peaks */}
      <polyline
        points="84,128 106,84 128,128"
        stroke="#555555"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points="104,128 130,74 156,128"
        stroke="#5a5a5a"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* House outline */}
      <polyline
        points="112,128 112,106 130,93 148,106 148,128"
        stroke="#636363"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points="106,107 130,92 154,107"
        stroke="#636363"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Circular window */}
      <circle cx="130" cy="116" r="6" stroke="#636363" strokeWidth="2" />
      <line x1="130" y1="110.5" x2="130" y2="121.5" stroke="#636363" strokeWidth="1.5" />
      <line x1="124.5" y1="116" x2="135.5" y2="116" stroke="#636363" strokeWidth="1.5" />

      {/* Wave */}
      <path
        d="M8,136 C32,124 62,144 94,135 C126,126 148,142 164,132"
        stroke="#E24A43"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
