import type { Motif } from "./journalData";

/*
 * Stand-in photographs for the journal, painted as small SVG scenes so the wall reads as real prints until
 * Mahima's own pictures go in (pass `src` to the print instead). Natural colours, the same in both styles, as
 * photographs would be.
 */

const BOKEH = (seed: number, color: string, n = 9) =>
  Array.from({ length: n }, (_, i) => {
    const x = (Math.sin(seed * 9.1 + i * 7.3) * 0.5 + 0.5) * 300;
    const y = (Math.sin(seed * 3.7 + i * 4.1) * 0.5 + 0.5) * 220;
    const r = 8 + (Math.sin(seed + i * 2.3) * 0.5 + 0.5) * 22;
    return <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={0.18 + 0.12 * ((i * 37) % 3)} />;
  });

export function PhotoArt({ motif, id }: { motif: Motif; id: string }) {
  const g = (name: string) => `${id}-${name}`;
  return (
    <svg viewBox="0 0 300 360" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={g("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={motif === "greenhouse" ? "#f3e7c6" : motif === "garden" ? "#ffe7a8" : "#dfe9c8"} />
          <stop offset="1" stopColor={motif === "leaf" ? "#2f5f2a" : "#8fb06a"} />
        </linearGradient>
        <radialGradient id={g("sun")} cx="0.75" cy="0.15" r="0.6">
          <stop offset="0" stopColor="#fff7d6" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff7d6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g("soil")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b4a2f" />
          <stop offset="1" stopColor="#3d2a1a" />
        </linearGradient>
        <linearGradient id={g("leaf")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9cc95e" />
          <stop offset="1" stopColor="#3f7a2e" />
        </linearGradient>
      </defs>
      <rect width="300" height="360" fill={`url(#${g("sky")})`} />
      {BOKEH(motif.length, "#fffbe6")}
      <rect width="300" height="360" fill={`url(#${g("sun")})`} />

      {motif === "seedling" && (
        <>
          <path d="M0 250 Q150 225 300 252 L300 360 L0 360 Z" fill={`url(#${g("soil")})`} />
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={(i * 53) % 300} cy={262 + ((i * 29) % 90)} r={1.5 + (i % 3)} fill="#2c1d12" opacity="0.5" />
          ))}
          <path d="M150 252 C149 220 152 200 150 168" stroke="#7bab45" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M150 172 C120 150 96 160 92 176 C116 186 138 182 150 172 Z" fill={`url(#${g("leaf")})`} />
          <path d="M150 168 C176 140 206 146 212 162 C190 178 166 178 150 168 Z" fill={`url(#${g("leaf")})`} />
          <path d="M150 172 L100 176 M150 168 L204 160" stroke="#d8efb0" strokeWidth="1.2" opacity="0.7" />
          <ellipse cx="150" cy="254" rx="30" ry="6" fill="#2b1c10" opacity="0.5" />
        </>
      )}

      {motif === "leaf" && (
        <>
          <path d="M-20 340 C40 160 180 40 330 10 C300 170 190 310 -20 340 Z" fill={`url(#${g("leaf")})`} />
          <path d="M-10 335 C90 240 200 120 320 18" stroke="#d6eda8" strokeWidth="3" fill="none" opacity="0.8" />
          {Array.from({ length: 12 }, (_, i) => {
            const t = 0.08 + i * 0.075;
            const x = -10 + 330 * t, y = 335 - 317 * t + Math.sin(t * 3) * 20;
            return (
              <g key={i} stroke="#cfe8a0" strokeWidth="1.4" fill="none" opacity="0.6">
                <path d={`M${x} ${y} Q${x - 40} ${y - 10} ${x - 70} ${y - 50}`} />
                <path d={`M${x} ${y} Q${x + 10} ${y + 30} ${x + 50} ${y + 50}`} />
              </g>
            );
          })}
          {[
            [120, 210, 9],
            [196, 140, 6],
            [84, 268, 5],
            [230, 96, 7],
          ].map(([x, y, r], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill="#e9f7d6" opacity="0.55" />
              <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.3} fill="#ffffff" opacity="0.9" />
            </g>
          ))}
        </>
      )}

      {motif === "hands" && (
        <>
          <rect y="250" width="300" height="110" fill="#7c5a3a" />
          <path d="M100 210 L200 210 L186 300 L114 300 Z" fill="#b8643a" />
          <rect x="94" y="200" width="112" height="16" rx="4" fill="#c97445" />
          <ellipse cx="150" cy="206" rx="52" ry="7" fill="#4a3220" />
          <path d="M150 204 C148 180 150 160 152 140" stroke="#5e8f3a" strokeWidth="4" fill="none" />
          <path d="M152 150 C132 130 112 136 110 148 C126 156 142 156 152 150 Z" fill={`url(#${g("leaf")})`} />
          <path d="M151 165 C172 146 192 152 194 164 C178 172 162 172 151 165 Z" fill={`url(#${g("leaf")})`} />
          <path d="M152 140 C160 120 176 116 182 124 C172 134 162 138 152 140 Z" fill={`url(#${g("leaf")})`} />
          {/* hands cupping the pot */}
          <path d="M40 300 C60 250 96 238 116 252 C122 268 116 290 104 304 C88 318 52 322 40 300 Z" fill="#c68b62" />
          <path d="M260 300 C240 250 204 238 184 252 C178 268 184 290 196 304 C212 318 248 322 260 300 Z" fill="#b97d55" />
          <path d="M104 262 C112 258 118 262 118 270 M98 276 C108 272 116 276 116 284" stroke="#a8714c" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M196 262 C188 258 182 262 182 270 M202 276 C192 272 184 276 184 284" stroke="#9c6844" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}

      {motif === "greenhouse" && (
        <>
          <path d="M20 330 L20 150 Q150 30 280 150 L280 330 Z" fill="#e8f1dc" opacity="0.55" />
          <g stroke="#f8f4ea" strokeWidth="3" fill="none" opacity="0.9">
            <path d="M20 330 L20 150 Q150 30 280 150 L280 330" />
            <path d="M85 330 L85 112 M150 330 L150 92 M215 330 L215 112" />
            <path d="M20 220 L280 220 M28 170 L272 170" />
          </g>
          {Array.from({ length: 3 }, (_, row) =>
            Array.from({ length: 9 }, (_, i) => (
              <ellipse key={`${row}-${i}`} cx={30 + i * 30 + row * 8} cy={300 - row * 34} rx={16 - row * 2} ry={22 - row * 3} fill={["#4f8a3a", "#6aa24a", "#3d7430"][(i + row) % 3]} />
            )),
          )}
          <rect y="320" width="300" height="40" fill="#6e5236" />
        </>
      )}

      {motif === "flowers" && (
        <>
          <rect y="170" width="300" height="190" fill="#4e8a3a" />
          {Array.from({ length: 34 }, (_, i) => {
            const x = (i * 71) % 300, y = 150 + ((i * 47) % 200), r = 9 + (i % 4) * 3;
            const col = ["#e2547a", "#f2b63c", "#c64bb0", "#ff8a4c", "#f4e3ef", "#e8443a"][i % 6];
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                {Array.from({ length: 6 }, (_, k) => (
                  <ellipse key={k} cx={0} cy={-r * 0.7} rx={r * 0.45} ry={r * 0.75} fill={col} transform={`rotate(${k * 60})`} />
                ))}
                <circle r={r * 0.32} fill="#ffd74a" />
              </g>
            );
          })}
        </>
      )}

      {motif === "garden" && (
        <>
          <ellipse cx="220" cy="60" rx="60" ry="60" fill="#fff4c4" opacity="0.6" />
          <path d="M0 210 Q80 170 160 200 T300 190 L300 360 L0 360 Z" fill="#6c9f45" />
          <path d="M0 250 Q100 220 190 250 T300 240 L300 360 L0 360 Z" fill="#4c8237" />
          <path d="M120 360 C140 300 170 270 160 240 L176 240 C190 270 170 310 186 360 Z" fill="#d9c49a" />
          {Array.from({ length: 26 }, (_, i) => (
            <circle key={i} cx={(i * 83) % 300} cy={230 + ((i * 37) % 110)} r={3 + (i % 3)} fill={["#f2c14e", "#ef7a8a", "#ffffff", "#c35ab0"][i % 4]} />
          ))}
          {[30, 260].map((x) => (
            <g key={x}>
              <rect x={x - 4} y={140} width="8" height="90" fill="#5b3f26" />
              <circle cx={x} cy={128} r="42" fill="#3f7a2e" />
              <circle cx={x - 18} cy={140} r="26" fill="#55913c" />
            </g>
          ))}
        </>
      )}

      {/* film-like warmth and a soft vignette */}
      <rect width="300" height="360" fill="#ffcf8a" opacity="0.08" />
      <rect width="300" height="360" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="40" />
    </svg>
  );
}
