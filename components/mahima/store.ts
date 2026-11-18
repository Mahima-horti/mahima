import { THEMES, type Theme } from "./theme";

/*
 * Shared, per-frame state for both canvases and the page. Scroll triggers write it; the 3D scenes read it in their
 * frame loops (no React re-renders on scroll).
 */
export const garden = {
  /** 0..1 through the opening scene (its pinned height). */
  intro: 0,
  /** 0..1 as the About section rises into view: the vines part over this. */
  part: 0,
  /** 0..1 as the About section settles: its frame leaves unfurl over this. */
  about: 0,
  /** Seconds since the garden first drew (drives the opening leaf flight). */
  clock: 0,
  reduced: false,
  /** Clicks on the landing scene: a gust of wind at that point of the screen (ndc), at that moment (clock). */
  gusts: [] as { x: number; y: number; t: number }[],
  theme: THEMES.dream as Theme,
};

/** Sets the style and motion preference for the frame loops (called while the page renders). */
export function syncGarden(theme: Theme, reduced: boolean) {
  garden.theme = theme;
  garden.reduced = reduced;
}

/** Seeded random, so the garden is laid out the same on every visit. */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeOutCubic = (x: number) => 1 - (1 - clamp01(x)) ** 3;
export const easeInOutCubic = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
