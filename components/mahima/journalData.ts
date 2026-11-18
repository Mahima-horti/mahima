/*
 * Scene 03, the botanical journal: six photographs pegged to one long rope. The layout lives here, in pixels of
 * the gallery track, so the DOM prints and the 3D rope, clips and leaves are placed from the same numbers and stay
 * together as the track slides.
 */

export type Memory = { category: string; heading: string; body: string; placeholder: string; motif: Motif };
export type Motif = "seedling" | "leaf" | "hands" | "greenhouse" | "flowers" | "garden";

export const MEMORIES: Memory[] = [
  {
    category: "My journey",
    heading: "Where it all begins",
    body: "Every little journey starts with curiosity. Mine began with a fascination for the colours, textures and patterns hidden in the natural world. What started as simple observation slowly grew into a deeper interest in plants and their stories.",
    placeholder: "A close-up of a tiny green seedling emerging from soil",
    motif: "seedling",
  },
  {
    category: "Plant discoveries",
    heading: "Finding beauty in the little things",
    body: "From delicate leaf patterns to unexpected flower formations, I find endless inspiration in the smallest details. Every plant has something unique to teach us if we take a moment to observe.",
    placeholder: "Macro photograph of a beautifully patterned green leaf",
    motif: "leaf",
  },
  {
    category: "Learning & exploring",
    heading: "A little hands-on learning",
    body: "Learning about plants goes beyond books. Getting my hands into the soil, understanding growing conditions and observing how plants respond to their environment makes every experience more meaningful.",
    placeholder: "Hands planting a small plant in a pot",
    motif: "hands",
  },
  {
    category: "Nature & sustainability",
    heading: "Growing a greener mindset",
    body: "Nature constantly reminds us of the importance of balance. I'm interested in sustainable growing practices, responsible cultivation and the little changes that can help create healthier green spaces.",
    placeholder: "A sustainable garden or lush greenhouse",
    motif: "greenhouse",
  },
  {
    category: "Flowers & diversity",
    heading: "A world of colours",
    body: "Flowers have a way of making ordinary moments feel special. Exploring different varieties, understanding their growth and discovering their unique characteristics is one of my favourite parts of horticulture.",
    placeholder: "A vibrant collection of flowers in a botanical garden",
    motif: "flowers",
  },
  {
    category: "What's next",
    heading: "Always something new to grow",
    body: "My journey with horticulture is still unfolding. There are new plants to discover, techniques to explore and ideas waiting to take root. I'm excited to keep learning and growing along the way.",
    placeholder: "A sunlit garden with lush plants and flowers",
    motif: "garden",
  },
];

export type PhotoLayout = { x: number; clipY: number; w: number; h: number; rot: number; depth: number };
export type JournalLayout = { width: number; height: number; photos: PhotoLayout[]; rope: (x: number) => number; ropeFrom: number; ropeTo: number };

/**
 * Where everything sits on the track, for a gallery of the given height (px). Photos vary a little in size, tilt,
 * height on the rope and depth; the rope dips gently between them as if their weight pulled it down.
 */
export function journalLayout(galleryH: number, galleryW: number): JournalLayout {
  const unit = Math.min(galleryH, galleryW * 0.9);
  const spacing = unit * 0.58;
  const lead = galleryW * 0.18;
  const ropeTop = galleryH * 0.17;
  const sizes = [1, 0.9, 1.06, 0.94, 1.02, 0.96];
  const rots = [-3.2, 2.6, -1.8, 3.4, -2.6, 1.9];
  const depths = [0.6, 1, 0.75, 0.95, 0.65, 0.9];
  const photos: PhotoLayout[] = sizes.map((s, i) => {
    const w = unit * 0.36 * s;
    return { x: lead + i * spacing, clipY: 0, w, h: w * 1.22, rot: rots[i], depth: depths[i] };
  });
  // the rope: high at the clips' supports, sagging between them, drawn as one smooth line
  const rope = (x: number) => {
    const phase = (x - lead) / spacing;
    return ropeTop + unit * 0.035 * (1 - Math.cos(phase * Math.PI * 2)) * 0.5 + unit * 0.015 * Math.sin(phase * 1.3);
  };
  photos.forEach((p) => (p.clipY = rope(p.x)));
  const width = lead + (photos.length - 1) * spacing + galleryW * 0.62;
  return { width, height: galleryH, photos, rope, ropeFrom: -galleryW * 0.5, ropeTo: width + galleryW * 0.3 };
}

/** Live state shared between the DOM gallery and the 3D rope. */
export const journal = {
  /** 0..1 as the scene rises into view (the rope runs in, clips and prints appear). */
  enter: 0,
  /** 0..1 through the pinned horizontal walk. */
  progress: 0,
  /** Each print's current swing (degrees, on top of its rest tilt), so its clip turns with it. */
  swing: [0, 0, 0, 0, 0, 0],
  /** Track's top-left on screen (px) and its layout, written by the DOM, read by the 3D. */
  track: { left: 0, top: 0 },
  /** The gallery's left edge (px): prints and rope fade out past it, clear of the story panel. */
  clipLeft: 0,
  clipFade: 0,
  layout: null as JournalLayout | null,
};
