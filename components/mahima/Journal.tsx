"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { journal, journalLayout, MEMORIES, type JournalLayout } from "./journalData";
import { PhotoArt } from "./PhotoArt";
import { whish } from "./audio";
import { garden, smooth } from "./store";
import type { Theme } from "./theme";

gsap.registerPlugin(ScrollTrigger);

/*
 * Scene 03, the botanical journal. The section pins while the page scrolls on, and that scroll slides the gallery
 * track sideways: six prints pegged along one rope (the rope, pegs and ivy are drawn in 3D over the page, placed
 * from the same layout). The print nearest the focus line leads the story on the left, which changes with a
 * staggered reveal. Each print hangs from its peg on a little spring: it swings back as the rope moves and
 * drifts in the breeze, and its peg turns with it.
 */

const PAPER_GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.35 0 0 0 0 0.25 0 0 0 0.09 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")";

const words = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
};
const word = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -10, filter: "blur(4px)", transition: { duration: 0.25 } },
};

function Story({ index, theme }: { index: number; theme: Theme }) {
  const m = MEMORIES[index];
  return (
    <AnimatePresence mode="wait">
      <motion.div key={index} initial="hidden" animate="show" exit="exit" variants={words}>
        <motion.p variants={word} className="text-[11px] font-semibold uppercase tracking-[0.32em]" style={{ color: "var(--m-accent)", fontFamily: "var(--m-label)" }}>
          {m.category}
        </motion.p>
        <h3
          className="mt-5 text-[clamp(30px,3.6vw,54px)] leading-[1.04]"
          style={{ fontFamily: "var(--m-display)", fontWeight: theme.font.displayWeight, fontStyle: theme.font.displayStyle, letterSpacing: theme.font.tracking }}
        >
          {m.heading.split(" ").map((w, i) => (
            <motion.span key={i} variants={word} className="mr-[0.25em] inline-block">
              {w}
            </motion.span>
          ))}
        </h3>
        <motion.p variants={word} className="mt-6 max-w-[34ch] text-[clamp(15px,1.15vw,18px)] leading-[1.7]" style={{ color: "var(--m-muted)" }}>
          {m.body}
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}

/** A small hand-drawn sprig for the panel's corners. */
function Sprig({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className={className} style={{ transform: flip ? "scaleX(-1)" : undefined }} aria-hidden>
      <path d="M10 110 C40 80 60 60 100 14" stroke="var(--m-accent)" strokeWidth="1.6" fill="none" opacity="0.7" />
      {[0.2, 0.38, 0.56, 0.74].map((t, i) => {
        const x = 10 + 90 * t, y = 110 - 96 * t;
        return (
          <g key={i} opacity="0.55">
            <path d={`M${x} ${y} C${x - 18} ${y - 4} ${x - 26} ${y - 18} ${x - 22} ${y - 26} C${x - 10} ${y - 20} ${x - 2} ${y - 10} ${x} ${y} Z`} fill="var(--m-accent)" />
            <path d={`M${x} ${y} C${x + 14} ${y + 2} ${x + 24} ${y - 8} ${x + 24} ${y - 18} C${x + 12} ${y - 16} ${x + 2} ${y - 8} ${x} ${y} Z`} fill="var(--m-accent)" />
          </g>
        );
      })}
    </svg>
  );
}

export function Journal({ theme, webgl, onLayout }: { theme: Theme; webgl: boolean; onLayout: () => void }) {
  const section = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const gallery = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const prints = useRef<(HTMLDivElement | null)[]>([]);
  const [layout, setLayout] = useState<JournalLayout | null>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  // lay the track out for the gallery's size, and again whenever it changes
  useLayoutEffect(() => {
    const g = gallery.current;
    if (!g) return;
    let w0 = 0, h0 = 0;
    const measure = () => {
      const { width, height } = g.getBoundingClientRect();
      if (Math.abs(width - w0) < 2 && Math.abs(height - h0) < 2) return;
      w0 = width;
      h0 = height;
      const l = journalLayout(height, width);
      journal.layout = l;
      setLayout(l);
      onLayout();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(g);
    return () => ro.disconnect();
  }, [onLayout]);

  // pin the scene and turn the page's scroll into the track's slide
  useEffect(() => {
    if (!layout || !section.current || !track.current || !gallery.current) return;
    const ctx = gsap.context(() => {
      const distance = () => Math.max(0, layout.width - gallery.current!.clientWidth * 0.82);
      gsap.to(track.current, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section.current,
          start: "top top",
          end: () => `+=${distance() * 1.2 + innerHeight * 0.4}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (s) => {
            journal.progress = s.progress;
          },
        },
      });
      ScrollTrigger.create({
        trigger: section.current,
        start: "top bottom",
        end: "top top",
        onUpdate: (s) => {
          journal.enter = s.progress;
        },
      });
    }, section);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [layout]);

  // every frame: where the track is (for the 3D rope), each print's swing, and which print is in focus
  useEffect(() => {
    if (!layout) return;
    const angle = layout.photos.map(() => 0), spin = layout.photos.map(() => 0);
    let raf = 0, last = performance.now(), lastLeft: number | null = null, vel = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const tr = track.current?.getBoundingClientRect();
      const ga = gallery.current?.getBoundingClientRect();
      if (!tr || !ga) return;
      journal.track.left = tr.left;
      journal.track.top = tr.top;
      journal.clipLeft = ga.left;
      journal.clipFade = ga.width * 0.1;
      // the rope's sideways speed (px/s), smoothed
      if (lastLeft !== null && dt > 0) vel += ((tr.left - lastLeft) / dt - vel) * Math.min(1, dt * 8);
      lastLeft = tr.left;
      const t = garden.clock;
      const calm = garden.reduced;
      const focusX = ga.left + ga.width * 0.4;
      let best = 0, bestD = Infinity;
      layout.photos.forEach((p, i) => {
        // a damped spring per print, pushed by the rope's movement: the print lags behind, then settles
        const drive = calm ? 0 : vel * 0.0045;
        const acc = -26 * (angle[i] - drive) - 5.5 * spin[i];
        spin[i] += acc * dt;
        angle[i] += spin[i] * dt;
        const breeze = calm ? 0 : 0.9 * Math.sin(t * (0.6 + i * 0.07) + i * 1.7) + 0.35 * Math.sin(t * 1.7 + i);
        const swing = Math.max(-9, Math.min(9, angle[i] + breeze));
        journal.swing[i] = swing;
        const shown = smooth(0.3 + i * 0.07, 0.62 + i * 0.07, journal.enter);
        const el = prints.current[i];
        if (el) {
          el.style.transform = `translateY(${(1 - shown) * -36}px) rotate(${p.rot + swing}deg) scale(${0.86 + 0.18 * p.depth})`;
          el.style.opacity = String(shown);
        }
        const d = Math.abs(tr.left + p.x - focusX);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best !== activeRef.current) {
        activeRef.current = best;
        setActive(best);
        whish();
      }
      if (panel.current) panel.current.style.opacity = String(smooth(0.35, 0.85, journal.enter));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [layout]);

  return (
    <section ref={section} className="relative flex h-svh w-full flex-col overflow-hidden md:flex-row" aria-label="My journey">
      {/* the story for the print in focus */}
      <div ref={panel} className="relative z-10 flex h-[42%] shrink-0 flex-col justify-center px-6 pt-16 md:h-full md:w-[42%] md:px-[5vw] md:pt-0">
        <Sprig className="pointer-events-none absolute left-4 top-20 hidden h-20 w-20 md:block" />
        <Sprig className="pointer-events-none absolute bottom-16 right-6 hidden h-16 w-16 rotate-180 md:block" flip />
        <p className="mb-6 font-medium tabular-nums tracking-[0.2em]" style={{ color: "var(--m-muted)", fontFamily: "var(--m-label)", fontSize: 12 }}>
          {String(active + 1).padStart(2, "0")} <span className="opacity-50">/ {String(MEMORIES.length).padStart(2, "0")}</span>
        </p>
        <div className="min-h-[240px] md:min-h-[320px]">
          <Story index={active} theme={theme} />
        </div>
        <div className="mt-8 flex gap-2" aria-hidden>
          {MEMORIES.map((_, i) => (
            <span key={i} className="h-[3px] rounded-full transition-all duration-500" style={{ width: i === active ? 28 : 10, background: i === active ? "var(--m-accent)" : "var(--m-line)" }} />
          ))}
        </div>
      </div>

      {/* the hanging gallery */}
      {/* faded out at its left edge, so prints slide away behind the story rather than over it */}
      <div ref={gallery} className="relative min-h-0 flex-1" style={{ maskImage: "linear-gradient(90deg, transparent 0, #000 10%)", WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 10%)" }}>
        <div ref={track} className="absolute left-0 top-0 h-full will-change-transform" style={{ width: layout?.width ?? 0 }}>
          {!webgl && layout && (
            <svg className="pointer-events-none absolute left-0 top-0" width={layout.width} height={layout.height} aria-hidden>
              <path d={`M0 ${layout.rope(0)} ${Array.from({ length: 80 }, (_, i) => `L${(i / 79) * layout.width} ${layout.rope((i / 79) * layout.width)}`).join(" ")}`} stroke={theme.journal.rope} strokeWidth="5" fill="none" />
            </svg>
          )}
          {layout?.photos.map((p, i) => {
            const m = MEMORIES[i];
            return (
              <div
                key={i}
                ref={(el) => {
                  prints.current[i] = el;
                }}
                className="absolute transition-[filter] duration-700"
                style={{
                  left: p.x - p.w / 2,
                  top: p.clipY + 14,
                  width: p.w,
                  transformOrigin: "50% -14px",
                  zIndex: Math.round(p.depth * 10),
                  filter: i === active ? "none" : "saturate(0.82) brightness(0.95)",
                  opacity: 0,
                }}
              >
                <figure
                  className="relative m-0 p-[5%] pb-[16%]"
                  style={{
                    background: `${PAPER_GRAIN}, var(--m-paper)`,
                    boxShadow: `0 ${10 + 22 * p.depth}px ${26 + 40 * p.depth}px -14px var(--m-shadow), 0 2px 4px rgba(0,0,0,0.08)`,
                  }}
                >
                  <div className="relative overflow-hidden" style={{ aspectRatio: "300 / 360" }}>
                    <PhotoArt motif={m.motif} id={`p${i}`} />
                  </div>
                  <figcaption className="absolute inset-x-[5%] bottom-[3.5%] truncate text-[11px] italic" style={{ color: "#5c5546", fontFamily: "var(--m-body)" }} title={m.placeholder}>
                    {m.placeholder}
                  </figcaption>
                </figure>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
