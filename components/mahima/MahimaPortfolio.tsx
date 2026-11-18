"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SmoothScroll } from "../showcase/SmoothScroll";
import { asset } from "./asset";
import { Backdrop, BACK_CAM } from "./Backdrop";
import { mahimaFonts } from "./fonts";
import { Foreground, FORE_CAM } from "./Foreground";
import { onMute, setMuted, sound, startAudio, whish } from "./audio";
import { Journal } from "./Journal";
import { PetalLoader } from "./Loader";
import { About, Intro, Outro } from "./Sections";
import { garden, syncGarden } from "./store";
import { STYLE_KEY, THEMES, type ThemeId } from "./theme";

gsap.registerPlugin(ScrollTrigger);

/*
 * Mahima's portfolio: a walk into a living garden.
 *
 *   Scene 01  leaves blow in and gather round her name; scrolling walks into the garden while vines grow in from
 *             every edge until the screen is all foliage
 *   Scene 02  the vines part to show About, with leaves unfurling round the portrait
 *   Scene 03  the botanical journal: prints pegged along a rope, sliding past as the page scrolls
 *
 * Two canvases share one set of scroll values: the garden behind the words, and the vines, portrait leaves and
 * journal rope in front of them (that one lets every click through). Both styles are theme entries over the same
 * world; switching re-tints it in place, keeping the scroll and the gallery where they are.
 */

/** Mounted once the garden's assets have resolved: tells the page after the first frames have drawn. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady));
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

function readStyle(): ThemeId {
  try {
    const s = sessionStorage.getItem(STYLE_KEY);
    return s === "editorial" ? "editorial" : "dream";
  } catch {
    return "dream";
  }
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function StyleToggle({ value, onChange }: { value: ThemeId; onChange: (v: ThemeId) => void }) {
  return (
    <div
      role="group"
      aria-label="Visual style"
      className="flex rounded-full p-1 backdrop-blur-md"
      style={{ background: "var(--m-surface)", boxShadow: "inset 0 0 0 1px var(--m-line), 0 10px 30px -12px var(--m-shadow)" }}
    >
      {(["dream", "editorial"] as ThemeId[]).map((id) => {
        const on = id === value;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(id)}
            className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-300 md:px-4"
            style={{ fontFamily: "var(--m-label)", background: on ? "var(--m-accent)" : "transparent", color: on ? "var(--m-bg)" : "var(--m-muted)" }}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
              {id === "dream" ? (
                <path d="M3 13 C3 7 7 3 13 3 C13 9 9 13 3 13 Z M3 13 L9 7" fill="none" stroke="currentColor" strokeWidth="1.4" />
              ) : (
                <path d="M8 1 C11 5 11 11 8 15 C5 11 5 5 8 1 Z M8 3 L8 14" fill="none" stroke="currentColor" strokeWidth="1.4" />
              )}
            </svg>
            {id === "dream" ? "Dream" : "Editorial"}
          </button>
        );
      })}
    </div>
  );
}

/** The "M" mark: a stem rising through the letter, with a leaf unfurling from each shoulder. */
function Logo() {
  return (
    <a href="#" onClick={(e) => (e.preventDefault(), scrollTo({ top: 0, behavior: "smooth" }))} aria-label="Mahima, back to top" className="flex items-center gap-2.5">
      {/* a seal: a serif M in a thin ring, with a seedling sprouting from its centre (two leaves on a curling stem) */}
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden>
        <circle cx="24" cy="24" r="22.5" fill="var(--m-surface)" />
        <circle cx="24" cy="24" r="20" fill="none" stroke="var(--m-accent)" strokeWidth="0.8" opacity="0.7" />
        <text x="24" y="34" textAnchor="middle" fontSize="23" fill="var(--m-text)" style={{ fontFamily: "var(--font-mahima-gloock)" }}>
          M
        </text>
        <path d="M24 21 C24 17 25.5 14.5 27.5 12.5" fill="none" stroke="var(--m-accent)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M25.2 16 C22.2 15.8 20.4 13.6 20.6 11.2 C23.2 11.6 25 13.4 25.2 16 Z" fill="var(--m-accent)" />
        <path d="M27.5 12.5 C28.4 9.8 30.8 8.6 33 8.9 C32.6 11.4 30.4 12.9 27.5 12.5 Z" fill="var(--m-accent)" />
      </svg>
      <span className="hidden text-[13px] font-semibold uppercase tracking-[0.3em] sm:inline" style={{ fontFamily: "var(--m-label)" }}>
        Mahima
      </span>
    </a>
  );
}

/** Sound on / off. Sound itself starts with the first interaction (browsers require one). */
function SoundToggle() {
  const [muted, set] = useState(sound.muted);
  useEffect(() => {
    const off = onMute(set);
    return () => {
      off();
    };
  }, []);
  return (
    <button
      type="button"
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      aria-pressed={!muted}
      onClick={() => {
        startAudio();
        setMuted(!muted);
      }}
      className="flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md"
      style={{ background: "var(--m-surface)", boxShadow: "inset 0 0 0 1px var(--m-line)", color: "var(--m-text)" }}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
        {[3, 7, 11, 15].map((x, i) => (
          <rect key={x} x={x} y={muted ? 9 : 10 - [3, 6, 4, 2][i]} width="2" height={muted ? 2 : [6, 12, 8, 4][i]} rx="1" fill="currentColor" className="transition-all duration-300" />
        ))}
      </svg>
    </button>
  );
}

/** The bar along the top: the mark on the left; the style switch and the résumé download on the right. */
function TopNav({ style, onStyle }: { style: ThemeId; onStyle: (v: ThemeId) => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-[60] flex items-center justify-between px-4 py-3 md:px-8 md:py-5">
      <Logo />
      <div className="flex items-center gap-2 md:gap-3">
        <SoundToggle />
        <StyleToggle value={style} onChange={onStyle} />
        <a
          href={asset("/mahima/Mahima-Resume.docx")}
          download="Mahima-Resume.docx"
          className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-transform duration-300 hover:-translate-y-0.5"
          style={{ fontFamily: "var(--m-label)", background: "var(--m-accent)", color: "var(--m-bg)", boxShadow: "0 10px 26px -12px var(--m-shadow)" }}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
            <path d="M8 2 V10 M4.5 7 L8 10.5 L11.5 7 M3 13.5 H13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">Download</span> Résumé
        </a>
      </div>
    </header>
  );
}

export function MahimaPortfolio() {
  const [styleId, setStyleId] = useState<ThemeId>(readStyle);
  const [reduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [webgl] = useState(hasWebGL);
  const [lite] = useState(() => innerWidth < 768 || ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) < 4);
  const [layoutKey, setLayoutKey] = useState(0);
  const theme = THEMES[styleId];
  const intro = useRef<HTMLElement>(null);
  const about = useRef<HTMLElement>(null);
  const portrait = useRef<HTMLDivElement>(null);

  syncGarden(theme, reduced);

  const choose = (id: ThemeId) => {
    setStyleId(id);
    try {
      sessionStorage.setItem(STYLE_KEY, id);
    } catch {
      /* private mode: the choice just won't outlive the page */
    }
  };

  // the typefaces differ between styles, so text reflows: re-measure the scroll scenes once the new fonts are in
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => !cancelled && requestAnimationFrame(() => ScrollTrigger.refresh()));
    return () => {
      cancelled = true;
    };
  }, [styleId]);

  // scroll positions into the shared garden state
  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({ trigger: intro.current, start: "top top", end: "bottom bottom", onUpdate: (s) => (garden.intro = s.progress) });
      ScrollTrigger.create({ trigger: about.current, start: "top bottom", end: "top 20%", onUpdate: (s) => (garden.part = s.progress) });
      ScrollTrigger.create({ trigger: about.current, start: "top 75%", end: "top 15%", onUpdate: (s) => (garden.about = s.progress) });
    });
    // a fresh visit starts at the top of the garden
    garden.clock = 0;
    return () => ctx.revert();
  }, []);

  // the loader: until the garden has drawn (and at least long enough for the flower to open)
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(false);
  const shownRef = useRef(false);
  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => {
      garden.clock = 0; // the leaves start blowing in as the flower falls away
      setShown(true);
    }, Math.max(400, 2900 - performance.now() + mountedAt.current));
    return () => clearTimeout(id);
  }, [ready]);
  useEffect(() => {
    if (webgl) return;
    const id = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(id);
  }, [webgl]);

  // sound starts with the first touch of the page
  useEffect(() => {
    // one small whish while the flower is growing (straight away where the browser allows sound, otherwise on
    // the first touch, if the loader is still up)
    let whished = false;
    const go = () => {
      startAudio();
      // (resuming is asynchronous: try again a moment later, while the loader may still be up)
      if (!whished && !sound.running) setTimeout(() => !whished && !shownRef.current && sound.running && ((whished = true), whish()), 120);
      if (!whished && !shownRef.current && sound.running) {
        whished = true;
        whish();
      }
    };
    go();
    // a click on the opening scene is a gust of wind there: the leaves nearby are blown aside (silently)
    const blow = (e: PointerEvent) => {
      if (garden.intro > 0.3 || (e.target as HTMLElement).closest("a, button")) return;
      garden.gusts = [...garden.gusts.slice(-4), { x: (e.clientX / innerWidth) * 2 - 1, y: 1 - (e.clientY / innerHeight) * 2, t: garden.clock }];
    };
    addEventListener("pointerdown", blow);
    const evs = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    evs.forEach((e) => addEventListener(e, go, { passive: true }));
    return () => {
      evs.forEach((e) => removeEventListener(e, go));
      removeEventListener("pointerdown", blow);
    };
  }, []);

  const onLayout = useCallback(() => setLayoutKey((k) => k + 1), []);

  const vars = {
    "--m-bg": theme.ui.bg,
    "--m-text": theme.ui.text,
    "--m-muted": theme.ui.muted,
    "--m-accent": theme.ui.accent,
    "--m-surface": theme.ui.surface,
    "--m-line": theme.ui.line,
    "--m-frame": theme.ui.frame,
    "--m-paper": theme.journal.paper,
    "--m-shadow": theme.journal.shadow,
    "--m-display": theme.font.display,
    "--m-body": theme.font.body,
    "--m-label": theme.font.label,
    "--m-petal": theme.id === "dream" ? "#f4b6c4" : "#d9b46a",
    "--m-petal-2": theme.id === "dream" ? "#f9d3dc" : "#c4974a",
    background: `linear-gradient(180deg, ${theme.sky[0]}, ${theme.sky[1]})`,
    color: theme.ui.text,
    fontFamily: theme.font.body,
  } as React.CSSProperties;

  return (
    <SmoothScroll enabled={!reduced}>
      <div className={`${mahimaFonts} relative min-h-svh overflow-x-clip transition-colors duration-500`} style={vars}>
        {webgl ? (
          <Canvas
            className="!fixed inset-0"
            style={{ position: "fixed", inset: 0, zIndex: 0 }}
            dpr={lite ? [1, 1.25] : [1, 1.75]}
            shadows={!lite}
            camera={{ fov: BACK_CAM.fov, position: [0, 0, BACK_CAM.z], near: 0.1, far: 120 }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, powerPreference: "high-performance" }}
          >
            <Suspense fallback={null}>
              <Backdrop theme={theme} lite={lite} />
              <Ready onReady={() => setReady(true)} />
            </Suspense>
            {!lite && (
              <EffectComposer>
                <Bloom mipmapBlur intensity={theme.bloom} luminanceThreshold={0.8} luminanceSmoothing={0.3} />
                <Vignette offset={0.3} darkness={styleId === "editorial" ? 0.7 : 0.35} />
              </EffectComposer>
            )}
          </Canvas>
        ) : (
          // no WebGL: a still garden in gradients, so the words and the journal still stand on something
          <div
            aria-hidden
            className="fixed inset-0"
            style={{ background: `radial-gradient(60% 50% at 20% 10%, ${theme.sunGlow}66, transparent 70%), linear-gradient(180deg, ${theme.sky[0]}, ${theme.sky[1]})` }}
          />
        )}

        <main className="relative z-10">
          <Intro ref={intro} theme={theme} ready={shown} />
          <About ref={about} theme={theme} portraitRef={portrait} />
          <Journal theme={theme} webgl={webgl} onLayout={onLayout} />
          <Outro theme={theme} />
        </main>

        {webgl && (
          <Canvas
            style={{ position: "fixed", inset: 0, zIndex: 20, pointerEvents: "none" }}
            dpr={lite ? [1, 1.25] : [1, 1.75]}
            camera={{ fov: FORE_CAM.fov, position: [0, 0, FORE_CAM.z], near: 0.1, far: 50 }}
            gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
          >
            <Suspense fallback={null}>
              <Foreground theme={theme} lite={lite} portrait={portrait} layoutKey={layoutKey} />
            </Suspense>
          </Canvas>
        )}

        <TopNav style={styleId} onStyle={choose} />
        <PetalLoader show={!shown} />
      </div>
    </SmoothScroll>
  );
}
