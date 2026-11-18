import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { seeded } from "./store";

/*
 * Leaves as real 3D surfaces rather than flat cards: each blade is a parametric sheet with a V-shaped crease along
 * the midrib, a curl along its length and a drooping tip, so light rolls across it. A procedural texture draws the
 * midrib and the curving lateral veins (light, so a per-leaf tint shows through), with a matching normal map.
 *
 * Every leaf starts at its stem (the origin) and grows along +y, its face toward +z.
 */

export type LeafKind = "ovate" | "lance" | "heart" | "fern";

type Shape = { width: number; outline: (v: number) => number; fold: number; curl: number; droop: number; lobes?: number };

const SHAPES: Record<Exclude<LeafKind, "fern">, Shape> = {
  ovate: { width: 0.58, outline: (v) => Math.sin(Math.PI * Math.min(1, v * 1.05)) ** 0.75 * (1 - 0.22 * v), fold: 0.16, curl: 0.12, droop: 0.1 },
  lance: { width: 0.26, outline: (v) => Math.sin(Math.PI * v) ** 1.1, fold: 0.22, curl: 0.18, droop: 0.14 },
  heart: { width: 0.7, outline: (v) => Math.sin(Math.PI * Math.min(1, v)) ** 0.6 * (1 - 0.45 * v) + 0.25 * Math.exp(-(((v - 0.12) / 0.1) ** 2)), fold: 0.12, curl: 0.08, droop: 0.06, lobes: 0.1 },
};

function blade(shape: Shape, segU = 10, segV = 26) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= segV; j++) {
    const v = j / segV;
    const half = (shape.width / 2) * Math.max(0.0001, shape.outline(v));
    for (let i = 0; i <= segU; i++) {
      const u = (i / segU) * 2 - 1;
      const x = u * half;
      // heart leaves: the lobes sweep back below the stem
      const lobe = shape.lobes ? -shape.lobes * Math.abs(u) ** 2 * Math.exp(-(((v - 0.05) / 0.12) ** 2)) : 0;
      const y = v + lobe;
      const z = -Math.abs(u) * shape.fold * half * 1.6 + shape.curl * v * v - shape.droop * Math.max(0, v - 0.7) ** 2 * 6 + 0.03 * Math.sin(u * 3 + v * 9) * v;
      pos.push(x, y, z);
      uv.push(u * 0.5 + 0.5, v);
    }
  }
  for (let j = 0; j < segV; j++)
    for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i, b = a + segU + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A fern frond: small lance-shaped pinnae alternating along an arching rachis, smaller toward the tip. */
function frond() {
  const parts: THREE.BufferGeometry[] = [];
  const pinna = blade({ ...SHAPES.lance, width: 0.32, curl: 0.05, fold: 0.1 }, 4, 8);
  const n = 22;
  for (let k = 0; k < n; k++) {
    const s = 0.06 + (k / n) * 0.9;
    const size = 0.32 * (1 - s * 0.75);
    for (const side of [-1, 1]) {
      const g = pinna.clone();
      const m = new THREE.Matrix4()
        .makeTranslation(0, s, -0.12 * s * s)
        .multiply(new THREE.Matrix4().makeRotationZ(side * (1.05 - 0.25 * s)))
        .multiply(new THREE.Matrix4().makeRotationY(side * 0.25))
        .multiply(new THREE.Matrix4().makeScale(size, size, size));
      g.applyMatrix4(m);
      parts.push(g);
    }
  }
  // the rachis
  const stem = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.05, 0), new THREE.Vector3(0, 0.5, -0.03), new THREE.Vector3(0, 1, -0.12)]), 16, 0.008, 4);
  stem.deleteAttribute("normal");
  stem.computeVertexNormals();
  parts.push(stem);
  return mergeGeometries(parts.map((p) => p.index ? p.toNonIndexed() : p), false)!;
}

const cache = new Map<LeafKind, THREE.BufferGeometry>();
export function leafGeometry(kind: LeafKind) {
  let g = cache.get(kind);
  if (!g) {
    g = kind === "fern" ? frond() : blade(SHAPES[kind]);
    cache.set(kind, g);
  }
  return g;
}

/* ------------------------------------------------------------------ textures */

/** The vein pattern as a height field (0..1), drawn in the leaf's uv space. */
function veinHeight(kind: LeafKind, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#fff";
  g.lineCap = "round";
  // midrib, thick at the stem, thinning to the tip
  for (let i = 0; i < 40; i++) {
    const y0 = h - (i / 40) * h, y1 = h - ((i + 1) / 40) * h;
    g.lineWidth = Math.max(1, (kind === "lance" ? 6 : 9) * (1 - i / 40));
    g.beginPath();
    g.moveTo(w / 2, y0);
    g.lineTo(w / 2, y1);
    g.stroke();
  }
  // lateral veins arching outward and up toward the margin
  const count = kind === "lance" ? 14 : kind === "heart" ? 7 : 9;
  for (let k = 1; k <= count; k++) {
    const v = k / (count + 1);
    const y = h - v * h * 0.92;
    for (const side of [-1, 1]) {
      g.lineWidth = Math.max(1, 3.2 * (1 - v * 0.6));
      g.beginPath();
      g.moveTo(w / 2, y);
      g.bezierCurveTo(w / 2 + side * w * 0.16, y - h * 0.04, w / 2 + side * w * 0.32, y - h * 0.1, w / 2 + side * w * 0.46, y - h * (0.16 + 0.05 * v));
      g.stroke();
    }
  }
  return g.getImageData(0, 0, w, h);
}

function leafTextures(kind: LeafKind) {
  const w = 256, h = 512;
  const vein = veinHeight(kind === "fern" ? "lance" : kind, w, h);
  const rand = seeded(kind.length * 977);
  // colour: near white so each leaf's tint shows through, darker toward the margin, veins lighter
  const col = document.createElement("canvas");
  col.width = w;
  col.height = h;
  const cg = col.getContext("2d")!;
  const img = cg.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const u = Math.abs(x / w - 0.5) * 2, v = 1 - y / h;
      const edge = 1 - 0.28 * u ** 1.6;
      const base = 0.8 * edge * (0.94 + 0.06 * Math.sin(v * 40 + u * 9)) + 0.02 * (rand() - 0.5);
      const veinK = vein.data[i] / 255;
      const l = Math.min(1, base + veinK * 0.22);
      img.data[i] = 255 * l * 0.97;
      img.data[i + 1] = 255 * l;
      img.data[i + 2] = 255 * l * 0.86;
      img.data[i + 3] = 255;
    }
  cg.putImageData(img, 0, 0);
  // normals from the vein heights (Sobel): veins stand slightly proud of the blade
  const nor = document.createElement("canvas");
  nor.width = w;
  nor.height = h;
  const ng = nor.getContext("2d")!;
  const nimg = ng.createImageData(w, h);
  const H = (x: number, y: number) => vein.data[(Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * 1.6;
      const dy = (H(x, y + 1) - H(x, y - 1)) * 1.6;
      const n = new THREE.Vector3(-dx, dy, 1).normalize();
      const i = (y * w + x) * 4;
      nimg.data[i] = (n.x * 0.5 + 0.5) * 255;
      nimg.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      nimg.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      nimg.data[i + 3] = 255;
    }
  ng.putImageData(nimg, 0, 0);
  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const normalMap = new THREE.CanvasTexture(nor);
  return { map, normalMap };
}

const texCache = new Map<LeafKind, ReturnType<typeof leafTextures>>();

/** A leaf material: tinted per instance, both faces lit, with a little sheen and a breath of light through it. */
export function leafMaterial(kind: LeafKind) {
  let t = texCache.get(kind);
  if (!t) {
    t = leafTextures(kind);
    texCache.set(kind, t);
  }
  return new THREE.MeshPhysicalMaterial({
    map: t.map,
    normalMap: t.normalMap,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 0.55,
    sheen: 0.5,
    sheenRoughness: 0.45,
    side: THREE.DoubleSide,
    emissive: new THREE.Color("#2a3a10"),
    emissiveIntensity: 0.1,
  });
}
