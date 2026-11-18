"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { forwardRef, useEffect, useRef, useState } from "react";
import { asset } from "./asset";
import { garden } from "./store";
import type { Theme } from "./theme";

/*
 * Scene 01's words and Scene 02, the About section. The 3D garden, the gathering leaves and the vines are drawn on
 * the canvases behind and in front of these; the words stay as real, crisp text.
 */

const display = (theme: Theme) => ({
  fontFamily: "var(--m-display)",
  fontWeight: theme.font.displayWeight,
  fontStyle: theme.font.displayStyle,
  letterSpacing: theme.font.tracking,
});

/** Letters drifting in from a soft blur, one after another, as if the wind had set them down. */
function Drift({ text, delay, step = 0.045, className, style, letterStyle }: { text: string; delay: number; step?: number; className?: string; style?: React.CSSProperties; letterStyle?: React.CSSProperties }) {
  return (
    <span className={className} style={style} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          style={letterStyle}
          initial={{ opacity: 0, y: 14, filter: "blur(10px)", rotate: (i % 2 ? 1 : -1) * 4 }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", rotate: 0 }}
          transition={{ delay: garden.reduced ? 0 : delay + i * step, duration: garden.reduced ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </span>
  );
}

/** Scene 01: the name, settled in the middle of the gathering leaves; it fades as the vines close over it. */
export const Intro = forwardRef<HTMLElement, { theme: Theme; ready: boolean }>(function Intro({ theme, ready }, ref) {
  const words = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const p = garden.intro;
      if (words.current) {
        words.current.style.opacity = String(Math.max(0, Math.min(1, 1 - (p - 0.3) * 2.6)));
        words.current.style.transform = `translateY(${-p * 40}px) scale(${1 + p * 0.06})`;
      }
      if (cue.current) cue.current.style.opacity = String(Math.max(0, 1 - p * 12));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <section ref={ref} className="relative h-[330vh]" aria-label="Introduction">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center px-6 text-center">
        <div ref={words}>
          {/* "Hello," on its own line above the name, both in a bold display face */}
          <h1 className="leading-[0.9]" style={{ fontFamily: "var(--font-mahima-gloock)", letterSpacing: "-0.02em" }}>
            {/* the words wait for the loader to open, then settle in as the leaves gather */}
            {ready && <Drift text="Hey, I'm" delay={2.2} className="block text-[clamp(22px,3vw,44px)]" style={{ opacity: 0.7 }} />}
            {ready && (
              <Drift
                text="Mahima"
                delay={2.7}
                step={0.07}
                className="mt-[0.18em] block text-[clamp(60px,10.5vw,164px)]"
                // rose gold in Dream; in Editorial, gold leaf turning to sage, like a gilded leaf: a gradient on each letter (so the drift keeps it)
                letterStyle={{ backgroundImage: theme.id === "dream" ? "linear-gradient(180deg, #e9b8a0 0%, #c98a6c 45%, #9a5f48 100%)" : "linear-gradient(180deg, #f1e3b0 0%, #c9b066 42%, #8f9a52 78%, #5f7a45 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
              />
            )}
          </h1>
          <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.42em] md:text-[13px]" style={{ color: "var(--m-accent)", fontFamily: "var(--m-label)" }}>
            {ready && <Drift text="Horticulture Enthusiast" delay={3.1} step={0.03} />}
          </p>
        </div>
        <div ref={cue} className="absolute bottom-8 flex flex-col items-center gap-3" style={{ color: "var(--m-muted)" }}>
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: garden.reduced ? 0 : 4 }} className="text-[10px] uppercase tracking-[0.36em]" style={{ fontFamily: "var(--m-label)" }}>
            Scroll to wander in
          </motion.span>
          <span className="relative block h-10 w-px overflow-hidden" style={{ background: "var(--m-line)" }}>
            <motion.span
              className="absolute inset-x-0 h-1/2"
              style={{ background: "var(--m-accent)" }}
              animate={garden.reduced ? undefined : { y: ["-100%", "200%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: [0.6, 0, 0.4, 1] }}
            />
          </span>
        </div>
      </div>
    </section>
  );
});

const LINES = [
  "I'm Mahima, a horticulture enthusiast fascinated by the world of plants and the science behind their growth.",
  "I love exploring how nature works, from tiny seeds to thriving ecosystems.",
  "My curiosity drives me to learn about plant diversity, sustainable cultivation and the relationship between people and nature.",
  "I enjoy observing, experimenting and discovering new ways to nurture greener spaces.",
  "For me, horticulture is more than an interest. It's a journey of learning, growing and creating a greener tomorrow.",
];

const rise = {
  hidden: { opacity: 0, y: 26, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1, ease: [0.22, 1, 0.36, 1] as const } },
};

/** The portrait slot: a framed print with a soft painted placeholder, easy to swap for a real photo (`src`). */
function Portrait({ src }: { src?: string }) {
  return (
    <div className="relative overflow-hidden rounded-[26px] p-3" style={{ background: "var(--m-frame)", boxShadow: "0 40px 80px -30px var(--m-shadow), inset 0 0 0 1px var(--m-line)" }}>
      <div className="relative overflow-hidden rounded-[18px]" style={{ aspectRatio: "4 / 5" }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Mahima" className="h-full w-full object-cover object-top" />
        ) : (
          <svg viewBox="0 0 400 500" className="h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Portrait placeholder">
            <defs>
              <linearGradient id="pt-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#e9efd6" />
                <stop offset="1" stopColor="#9bb57a" />
              </linearGradient>
              <radialGradient id="pt-sun" cx="0.3" cy="0.2" r="0.7">
                <stop offset="0" stopColor="#fff8dc" stopOpacity="0.9" />
                <stop offset="1" stopColor="#fff8dc" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="400" height="500" fill="url(#pt-bg)" />
            <rect width="400" height="500" fill="url(#pt-sun)" />
            {Array.from({ length: 14 }, (_, i) => (
              <circle key={i} cx={(i * 97) % 400} cy={(i * 61) % 300} r={10 + (i % 4) * 9} fill="#fffbe6" opacity="0.18" />
            ))}
            {/* a soft silhouette: head and shoulders */}
            <circle cx="200" cy="215" r="70" fill="#6f8a55" opacity="0.55" />
            <path d="M70 500 C80 380 140 330 200 330 C260 330 320 380 330 500 Z" fill="#6f8a55" opacity="0.55" />
            <text x="200" y="470" textAnchor="middle" fontSize="15" letterSpacing="4" fill="#3d4d2c" opacity="0.7" style={{ fontFamily: "var(--m-label)" }}>
              PORTRAIT
            </text>
          </svg>
        )}
      </div>
    </div>
  );
}

/** Scene 02: About Mahima. */
export const About = forwardRef<HTMLElement, { theme: Theme; portraitRef: React.RefObject<HTMLDivElement | null> }>(function About({ theme, portraitRef }, ref) {
  const inner = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: inner, offset: ["start end", "end start"] });
  const lift = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const [reduced] = useState(() => garden.reduced);
  return (
    <section ref={ref} className="relative px-6 py-[18vh] md:px-[7vw]" aria-labelledby="about-heading">
      <div ref={inner} className="mx-auto grid max-w-[1240px] items-center gap-14 md:grid-cols-[0.9fr_1.1fr] md:gap-[7vw]">
        <motion.div ref={portraitRef} style={{ y: reduced ? 0 : lift }} className="mx-auto w-full max-w-[440px]">
          <Portrait src={asset("/mahima/portrait.jpg")} />
        </motion.div>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} transition={{ staggerChildren: 0.14 }} className="relative">
          <motion.p variants={rise} className="text-[11px] font-semibold uppercase tracking-[0.36em]" style={{ color: "var(--m-accent)", fontFamily: "var(--m-label)" }}>
            About me
          </motion.p>
          <motion.h2 id="about-heading" variants={rise} className="mt-5 text-[clamp(36px,4.6vw,68px)] leading-[1.02]" style={display(theme)}>
            Growing with curiosity, rooted in nature.
          </motion.h2>
          <motion.span variants={rise} className="mt-8 block h-px w-24" style={{ background: "var(--m-accent)" }} />
          <div className="mt-8 space-y-4">
            {LINES.map((l, i) => (
              <motion.p key={i} variants={rise} className="max-w-[56ch] text-[clamp(15px,1.15vw,18px)] leading-[1.75]" style={{ color: i === 0 ? "var(--m-text)" : "var(--m-muted)" }}>
                {l}
              </motion.p>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
});

/** A quiet close after the journal, so its pin releases into open page. */
export function Outro({ theme }: { theme: Theme }) {
  return (
    <section className="flex min-h-[70svh] flex-col items-center justify-center px-6 text-center">
      <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} className="text-[clamp(28px,3.6vw,52px)] leading-tight" style={display(theme)}>
        More chapters are still taking root.
      </motion.p>
      <p className="mt-5 text-[11px] uppercase tracking-[0.36em]" style={{ color: "var(--m-muted)", fontFamily: "var(--m-label)" }}>
        Mahima · Horticulture
      </p>
    </section>
  );
}
