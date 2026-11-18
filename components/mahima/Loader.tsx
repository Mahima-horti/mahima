"use client";

import { AnimatePresence, motion } from "framer-motion";

/*
 * The loader: a flower growing while the garden loads behind it. First the stem rises from the soil line, two
 * leaves unfurl along it, then the bud swells at the top and opens petal by petal around its centre; the flower
 * then sways gently in the breeze until the garden is ready, and the whole thing fades away.
 */

const PETALS = 8;
const HEAD = { x: 60, y: 46 };
const EASE = [0.22, 1, 0.36, 1] as const;

export function PetalLoader({ show, label = "Growing the garden" }: { show: boolean; label?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="loader"
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6"
          style={{ background: "var(--m-bg)" }}
          exit={{ opacity: 0, transition: { duration: 0.9, ease: [0.4, 0, 0.2, 1] } }}
          role="status"
          aria-label={label}
        >
          <svg viewBox="0 0 120 160" className="h-40 w-32 overflow-visible md:h-48 md:w-36">
            {/* the soil line */}
            <motion.path d="M30 150 Q60 146 90 150" stroke="var(--m-muted)" strokeWidth="1.5" strokeLinecap="round" fill="none" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.6 }} transition={{ duration: 0.5 }} />
            {/* everything above the soil sways together once grown */}
            <motion.g style={{ transformOrigin: "60px 150px" }} animate={{ rotate: [0, 0, 2.5, -2, 0] }} transition={{ duration: 4.5, times: [0, 0.45, 0.65, 0.85, 1], repeat: Infinity, ease: "easeInOut" }}>
              {/* 1. the stem rises */}
              <motion.path
                d="M60 150 C58 128 64 112 60 92 C57 76 61 62 60 50"
                stroke="var(--m-accent)"
                strokeWidth="2.6"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
              />
              {/* 2. two leaves unfurl along it */}
              {[
                { d: "M60 112 C48 108 40 98 38 88 C50 90 58 100 60 112 Z", o: "60px 112px", delay: 0.95 },
                { d: "M60 88 C72 84 80 74 82 64 C70 66 62 76 60 88 Z", o: "60px 88px", delay: 1.15 },
              ].map((l, i) => (
                <motion.path key={i} d={l.d} fill="var(--m-accent)" style={{ transformOrigin: l.o }} initial={{ scale: 0, opacity: 0, rotate: i ? -25 : 25 }} animate={{ scale: 1, opacity: 0.9, rotate: 0 }} transition={{ duration: 0.7, delay: l.delay, ease: EASE }} />
              ))}
              {/* 3. the bud swells, then the petals open one by one */}
              <motion.g style={{ transformOrigin: `${HEAD.x}px ${HEAD.y}px` }} initial={{ scale: 0.2 }} animate={{ scale: 1 }} transition={{ duration: 0.9, delay: 1.35, ease: EASE }}>
                {Array.from({ length: PETALS }, (_, i) => {
                  const angle = (i / PETALS) * 360;
                  return (
                    <g key={i} transform={`rotate(${angle} ${HEAD.x} ${HEAD.y})`}>
                      <motion.ellipse
                        cx={HEAD.x}
                        cy={HEAD.y - 11}
                        rx="6.5"
                        ry="11"
                        fill={i % 2 ? "var(--m-petal)" : "var(--m-petal-2)"}
                        style={{ transformOrigin: `${HEAD.x}px ${HEAD.y}px` }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 0.95 }}
                        transition={{ duration: 0.55, delay: 1.5 + i * 0.09, ease: EASE }}
                      />
                    </g>
                  );
                })}
                <motion.circle cx={HEAD.x} cy={HEAD.y} r="6" fill="#e9b949" style={{ transformOrigin: `${HEAD.x}px ${HEAD.y}px` }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 1.4, ease: EASE }} />
                <motion.circle cx={HEAD.x} cy={HEAD.y} r="2.4" fill="#b9792a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} />
              </motion.g>
            </motion.g>
          </svg>
          <motion.p
            className="text-[10px] uppercase tracking-[0.42em]"
            style={{ color: "var(--m-muted)", fontFamily: "var(--m-label)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: 0.4 }}
          >
            {label}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
