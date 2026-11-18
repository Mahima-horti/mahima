/*
 * The two looks for Mahima's garden. One 3D world is built once; everything that differs between the styles
 * (palette, light, atmosphere, leaf and vine materials, typography, UI colours) lives here, so switching style is
 * just reading another entry: nothing reloads.
 */

export type ThemeId = "dream" | "editorial";

export type Theme = {
  id: ThemeId;
  name: string;
  /** Sky gradient, top to bottom, and the glow where the sun sits. */
  sky: [string, string];
  sunGlow: string;
  fog: { color: string; near: number; far: number };
  light: {
    ambientSky: string;
    ambientGround: string;
    ambient: number;
    sun: { color: string; intensity: number; position: [number, number, number] };
    rim: { color: string; intensity: number; position: [number, number, number] };
  };
  /** Leaf tints (one is picked per leaf), the vein colour, and how the surface catches light. */
  leaf: { colors: string[]; sheen: string; roughness: number; glow: number };
  vine: string;
  /** The journal: rope, wooden clips and their spring, and the prints' paper. */
  journal: { rope: string; clip: string; spring: string; paper: string; shadow: string };
  pollen: string;
  beams: { color: string; opacity: number };
  bloom: number;
  exposure: number;
  ui: { bg: string; text: string; muted: string; accent: string; surface: string; line: string; frame: string };
  font: { display: string; body: string; label: string; displayWeight: number; displayStyle: "normal" | "italic"; tracking: string };
};

export const THEMES: Record<ThemeId, Theme> = {
  dream: {
    id: "dream",
    name: "Botanical Dream",
    sky: ["#f6f1e4", "#dfe7cc"],
    sunGlow: "#fff6da",
    fog: { color: "#ecefdf", near: 7, far: 26 },
    light: {
      ambientSky: "#fffbea",
      ambientGround: "#b8c795",
      ambient: 1.25,
      sun: { color: "#fff0cf", intensity: 2.6, position: [-5, 7, 6] },
      rim: { color: "#efffd9", intensity: 0.9, position: [5, 2, -4] },
    },
    leaf: { colors: ["#7fa35a", "#99bd6a", "#5f8b47", "#afc883", "#86aa61"], sheen: "#f6ffd8", roughness: 0.55, glow: 0.08 },
    vine: "#6f8446",
    journal: { rope: "#a8835a", clip: "#e1c79c", spring: "#9aa0a6", paper: "#fbf8ef", shadow: "rgba(70, 60, 30, 0.28)" },
    pollen: "#fff3c4",
    beams: { color: "#fff2c8", opacity: 0.2 },
    bloom: 0.35,
    exposure: 1.05,
    ui: {
      bg: "#eef0e0",
      text: "#2d3823",
      muted: "#66704f",
      accent: "#7c9150",
      surface: "rgba(252, 250, 240, 0.72)",
      line: "rgba(61, 78, 39, 0.18)",
      frame: "#e8e4d2",
    },
    font: { display: "var(--font-mahima-instrument)", body: "var(--font-mahima-dmsans)", label: "var(--font-mahima-dmsans)", displayWeight: 400, displayStyle: "italic", tracking: "-0.015em" },
  },
  editorial: {
    id: "editorial",
    name: "Botanical Editorial",
    sky: ["#13241a", "#060e09"],
    sunGlow: "#c9a463",
    fog: { color: "#0b170f", near: 5, far: 20 },
    light: {
      ambientSky: "#3c5a44",
      ambientGround: "#0a120c",
      ambient: 0.45,
      sun: { color: "#ffd59a", intensity: 4.4, position: [6, 5, 4] },
      rim: { color: "#9fe0b8", intensity: 2.2, position: [-6, 1, -3] },
    },
    leaf: { colors: ["#1f4a2c", "#2c5d33", "#3c6b3a", "#173d23", "#2f5a3c"], sheen: "#b9e6a4", roughness: 0.38, glow: 0.02 },
    vine: "#2a3a1f",
    journal: { rope: "#5b4630", clip: "#a9875a", spring: "#7d8287", paper: "#efe8d6", shadow: "rgba(0, 0, 0, 0.6)" },
    pollen: "#e8c98a",
    beams: { color: "#ffd9a0", opacity: 0.12 },
    bloom: 0.55,
    exposure: 1.0,
    ui: {
      bg: "#08120c",
      text: "#ece6d4",
      muted: "#a8a68e",
      accent: "#c8a45e",
      surface: "rgba(10, 22, 15, 0.7)",
      line: "rgba(214, 196, 150, 0.2)",
      frame: "#1c2b20",
    },
    font: { display: "var(--font-mahima-bodoni)", body: "var(--font-mahima-inter)", label: "var(--font-mahima-inter)", displayWeight: 500, displayStyle: "normal", tracking: "-0.02em" },
  },
};

export const STYLE_KEY = "mahima-style";
