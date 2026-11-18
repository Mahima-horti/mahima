"use client";

/* eslint-disable react-hooks/immutability -- three.js objects are driven per frame by design */
import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { journal } from "./journalData";
import { leafGeometry, leafMaterial, type LeafKind } from "./leaves";
import { easeInOutCubic, garden, seeded, smooth } from "./store";
import type { Theme } from "./theme";

/*
 * The layer in front of the words (its canvas sits over the page and lets every click through):
 *  - the vines: they grow in from every edge as the opening scrolls, putting out leaves as their tips pass, until
 *    the screen is a wall of foliage, then part back to their edges like curtains to reveal the About section;
 *  - a few leaves unfurling round the portrait, tracking its frame on the page;
 *  - the journal's rope, wooden clips and the ivy along it, tracking the gallery as it slides.
 * Its camera never moves: everything here is placed in screen terms.
 */

const CAM = { z: 5, fov: 38 };
const HALF_H = CAM.z * Math.tan(THREE.MathUtils.degToRad(CAM.fov / 2));

const tmp = { o: new THREE.Object3D(), v: new THREE.Vector3(), c: new THREE.Color(), e: new THREE.Euler() };

/** A page point (px) on the plane z = 0, in this camera's world. */
function toWorld(px: number, py: number, out: THREE.Vector3, halfW: number) {
  return out.set((px / innerWidth) * 2 * halfW - halfW, HALF_H - (py / innerHeight) * 2 * HALF_H, 0);
}

/** Growth reveal: discard everything past `uGrow` along the tube's length (uv.x). */
function growingMaterial(color: string, roughness = 0.75) {
  const m = new THREE.MeshStandardMaterial({ color, roughness });
  const grow = { value: 0 };
  m.onBeforeCompile = (s) => {
    s.uniforms.uGrow = grow;
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying float vAlong;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvAlong = uv.x;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vAlong; uniform float uGrow;").replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (vAlong > uGrow) discard;");
  };
  return { m, grow };
}

/** A tube whose thickness tapers from base to tip. */
function taperedTube(curve: THREE.Curve<THREE.Vector3>, segments: number, radius: number, tip: number) {
  const g = new THREE.TubeGeometry(curve, segments, radius, 6, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const ring = 7;
  const c = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    curve.getPointAt(i / segments, c);
    const k = 1 - (1 - tip) * (i / segments);
    for (let j = 0; j < ring; j++) {
      const n = i * ring + j;
      pos.setXYZ(n, c.x + (pos.getX(n) - c.x) * k, c.y + (pos.getY(n) - c.y) * k, c.z + (pos.getZ(n) - c.z) * k);
    }
  }
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ the vines */

type VineLeaf = { vine: number; s: number; pos: THREE.Vector3; angle: number; tilt: THREE.Vector2; size: number; tint: number; kind: LeafKind; cover: boolean };
type Vine = { curve: THREE.CatmullRomCurve3; geo: THREE.TubeGeometry; out: THREE.Vector2; start: number };

function makeVines(halfW: number, count: number, perVine: number) {
  const r = seeded(512);
  const vines: Vine[] = [];
  const leaves: VineLeaf[] = [];
  const reach = Math.max(halfW, HALF_H) * 2.4;
  for (let k = 0; k < count; k++) {
    const edge = k % 4;
    const along = (r() * 2 - 1) * 0.9;
    const start = edge === 0 ? new THREE.Vector3(-halfW - 0.1, along * HALF_H, 0) : edge === 1 ? new THREE.Vector3(halfW + 0.1, along * HALF_H, 0) : edge === 2 ? new THREE.Vector3(along * halfW, HALF_H + 0.1, 0) : new THREE.Vector3(along * halfW, -HALF_H - 0.1, 0);
    let heading = edge === 0 ? 0 : edge === 1 ? Math.PI : edge === 2 ? -Math.PI / 2 : Math.PI / 2;
    heading += (r() - 0.5) * 0.9;
    const steps = 56;
    const len = reach / steps;
    const phase = r() * 6.28, wander = 0.08 + r() * 0.08;
    const pts = [start.clone()];
    const p = start.clone();
    const depth = (r() - 0.5) * 0.5;
    for (let i = 0; i < steps; i++) {
      heading += Math.sin(i * 0.23 + phase) * wander + (r() - 0.5) * 0.12;
      p.x += Math.cos(heading) * len;
      p.y += Math.sin(heading) * len;
      p.z = depth + Math.sin(i * 0.3 + phase) * 0.15;
      pts.push(p.clone());
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const out = edge === 0 ? new THREE.Vector2(-1, 0) : edge === 1 ? new THREE.Vector2(1, 0) : edge === 2 ? new THREE.Vector2(0, 1) : new THREE.Vector2(0, -1);
    vines.push({ curve, geo: taperedTube(curve, 220, 0.016 + r() * 0.012, 0.25), out, start: 0.12 + r() * 0.28 });
    // leaves: alternating along the stem, larger toward the base, then big ones that close the last gaps
    for (let i = 0; i < perVine; i++) {
      const s = 0.04 + (i / perVine) * 0.94;
      const t = curve.getTangentAt(s);
      const side = i % 2 ? 1 : -1;
      const base = Math.atan2(t.y, t.x) + side * (0.9 + r() * 0.6);
      const cover = i % 3 === 0;
      leaves.push({
        vine: k,
        s,
        pos: curve.getPointAt(s).add(new THREE.Vector3(0, 0, 0.02 + r() * 0.08)),
        angle: base - Math.PI / 2,
        tilt: new THREE.Vector2((r() - 0.5) * 0.9, (r() - 0.5) * 0.9),
        size: (cover ? 0.55 : 0.26) * (1.15 - s * 0.45) * (0.75 + r() * 0.5),
        tint: Math.floor(r() * 5),
        kind: r() < 0.6 ? "heart" : "ovate",
        cover,
      });
    }
  }
  return { vines, leaves };
}

function VineLeaves({ leaves, kind, vines, theme, grow }: { leaves: VineLeaf[]; kind: LeafKind; vines: Vine[]; theme: Theme; grow: (v: number) => number }) {
  const mine = useMemo(() => leaves.filter((l) => l.kind === kind), [leaves, kind]);
  const geo = useMemo(() => leafGeometry(kind), [kind]);
  const mat = useMemo(() => leafMaterial(kind), [kind]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    mat.roughness = theme.leaf.roughness;
    mat.sheenColor.set(theme.leaf.sheen);
    mat.emissive.set(theme.leaf.colors[2]);
    mat.emissiveIntensity = theme.leaf.glow;
    mine.forEach((l, i) => m.setColorAt(i, tmp.c.set(theme.leaf.colors[l.tint % theme.leaf.colors.length])));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [theme, mine, mat]);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const t = garden.clock;
    const calm = garden.reduced ? 0 : 1;
    const part = easeInOutCubic(garden.part);
    const coverK = smooth(0.66, 0.9, garden.intro);
    mine.forEach((l, i) => {
      const v = vines[l.vine];
      const g = grow(l.vine);
      // unfurls as the tip passes; the big ones wait to close the wall at the end
      const a = smooth(l.s, l.s + 0.08, g) * (l.cover ? coverK : 1);
      const o = tmp.o;
      o.position.copy(l.pos);
      // parting: back off toward the edge it grew from, far enough that even its far end leaves the screen
      o.position.x += v.out.x * part * 2.5 * (innerWidth / innerHeight) * HALF_H;
      o.position.y += v.out.y * part * 2.5 * HALF_H;
      tmp.e.set(l.tilt.x + (1 - a) * 1.3 + calm * 0.08 * Math.sin(t * 1.1 + i), l.tilt.y + calm * 0.06 * Math.sin(t * 0.9 + i * 1.7), l.angle + calm * 0.05 * Math.sin(t * 0.7 + i));
      o.rotation.copy(tmp.e);
      o.scale.setScalar(Math.max(0.0001, l.size * a * (1 + 0.15 * coverK)));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  if (!mine.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, mine.length]} frustumCulled={false} />;
}

function Vines({ theme, lite }: { theme: Theme; lite: boolean }) {
  const { size } = useThree();
  const halfW = HALF_H * (size.width / Math.max(1, size.height));
  const { vines, leaves } = useMemo(() => makeVines(halfW, lite ? 12 : 18, lite ? 22 : 30), [halfW, lite]);
  // tinted by the theme effect below, so a style switch doesn't rebuild them
  const mats = useMemo(() => vines.map(() => growingMaterial("#6f8446")), [vines]);
  const groups = useRef<THREE.Group[]>([]);
  const root = useRef<THREE.Group>(null);
  useEffect(() => mats.forEach(({ m }) => m.color.set(theme.vine)), [theme, mats]);
  const grow = useMemo(() => (v: number) => smooth(vines[v].start, vines[v].start + 0.5, garden.intro), [vines]);
  useFrame(() => {
    const part = easeInOutCubic(garden.part);
    if (root.current) root.current.visible = garden.intro > 0.08 && garden.part < 0.999;
    vines.forEach((v, k) => {
      mats[k].grow.value = grow(k);
      const g = groups.current[k];
      if (g) g.position.set(v.out.x * part * 2.5 * halfW, v.out.y * part * 2.5 * HALF_H, 0);
    });
  });
  return (
    <group ref={root}>
      {vines.map((v, k) => (
        <group
          key={k}
          ref={(g) => {
            if (g) groups.current[k] = g;
          }}
        >
          <mesh geometry={v.geo} material={mats[k].m} />
        </group>
      ))}
      <VineLeaves leaves={leaves} kind="heart" vines={vines} theme={theme} grow={grow} />
      <VineLeaves leaves={leaves} kind="ovate" vines={vines} theme={theme} grow={grow} />
    </group>
  );
}

/* ------------------------------------------------------------------ leaves round the portrait */

/** Leaves clustered at two corners of the portrait and fern sprigs, as (u, v) in the frame (0..1). */
const FRAME_LEAVES: { u: number; v: number; angle: number; size: number; kind: LeafKind; tint: number; delay: number }[] = [
  { u: -0.04, v: -0.03, angle: 2.4, size: 0.26, kind: "heart", tint: 0, delay: 0 },
  { u: 0.08, v: -0.06, angle: 3.1, size: 0.2, kind: "ovate", tint: 1, delay: 0.06 },
  { u: -0.07, v: 0.1, angle: 1.7, size: 0.22, kind: "ovate", tint: 2, delay: 0.1 },
  { u: 0.18, v: -0.04, angle: 3.5, size: 0.15, kind: "heart", tint: 3, delay: 0.14 },
  { u: -0.05, v: 0.24, angle: 1.4, size: 0.14, kind: "heart", tint: 4, delay: 0.2 },
  { u: 1.04, v: 1.02, angle: -0.8, size: 0.27, kind: "ovate", tint: 1, delay: 0.08 },
  { u: 0.92, v: 1.06, angle: -0.2, size: 0.21, kind: "heart", tint: 0, delay: 0.12 },
  { u: 1.07, v: 0.88, angle: -1.4, size: 0.19, kind: "heart", tint: 2, delay: 0.16 },
  { u: 0.8, v: 1.04, angle: 0.3, size: 0.14, kind: "ovate", tint: 3, delay: 0.22 },
  { u: 1.05, v: 0.74, angle: -1.7, size: 0.13, kind: "ovate", tint: 4, delay: 0.26 },
  { u: -0.03, v: 1.0, angle: 0.5, size: 0.42, kind: "fern", tint: 2, delay: 0.18 },
  { u: 1.02, v: 0.02, angle: -2.6, size: 0.36, kind: "fern", tint: 1, delay: 0.3 },
];

const FRAME_KINDS: LeafKind[] = ["heart", "ovate", "fern"];

function FrameLeaves({ portrait, theme }: { portrait: React.RefObject<HTMLElement | null>; theme: Theme }) {
  const { size } = useThree();
  const halfW = HALF_H * (size.width / Math.max(1, size.height));
  const refs = useRef<Record<string, THREE.InstancedMesh | null>>({});
  const geos = useMemo(() => Object.fromEntries(FRAME_KINDS.map((k) => [k, leafGeometry(k)])), []);
  const mats = useMemo(() => Object.fromEntries(FRAME_KINDS.map((k) => [k, leafMaterial(k)])), []);
  const corner = useMemo(() => new THREE.Vector3(), []);
  const corner2 = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    FRAME_KINDS.forEach((k) => {
      const m = refs.current[k];
      const mat = mats[k];
      mat.roughness = theme.leaf.roughness;
      mat.sheenColor.set(theme.leaf.sheen);
      if (!m) return;
      FRAME_LEAVES.filter((l) => l.kind === k).forEach((l, i) => m.setColorAt(i, tmp.c.set(theme.leaf.colors[l.tint % theme.leaf.colors.length])));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }, [theme, mats]);
  useFrame(() => {
    const r = portrait.current?.getBoundingClientRect();
    const show = !!r && r.bottom > -100 && r.top < innerHeight + 100 && garden.about > 0.001;
    FRAME_KINDS.forEach((k) => {
      const m = refs.current[k];
      if (m) m.visible = show;
    });
    if (!show || !r) return;
    toWorld(r.left, r.top, corner, halfW);
    toWorld(r.right, r.bottom, corner2, halfW);
    const w = corner2.x - corner.x, h = corner.y - corner2.y;
    const t = garden.clock;
    const calm = garden.reduced ? 0 : 1;
    const counts: Record<string, number> = {};
    FRAME_LEAVES.forEach((l, idx) => {
      const m = refs.current[l.kind];
      if (!m) return;
      const i = (counts[l.kind] = (counts[l.kind] ?? -1) + 1);
      const a = smooth(l.delay, l.delay + 0.5, garden.about);
      const o = tmp.o;
      o.position.set(corner.x + l.u * w, corner.y - l.v * h, 0.3);
      o.rotation.set(0.3 + (1 - a) * 1.2 + calm * 0.06 * Math.sin(t * 1.2 + idx), 0.2 * Math.sin(idx) + calm * 0.05 * Math.sin(t * 0.8 + idx), l.angle + calm * 0.05 * Math.sin(t * 0.7 + idx * 1.3));
      o.scale.setScalar(Math.max(0.0001, l.size * h * a));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    FRAME_KINDS.forEach((k) => {
      const m = refs.current[k];
      if (m) m.instanceMatrix.needsUpdate = true;
    });
  });
  return (
    <>
      {FRAME_KINDS.map((k) => (
        <instancedMesh
          key={k}
          ref={(m) => {
            refs.current[k] = m;
          }}
          args={[geos[k], mats[k], FRAME_LEAVES.filter((l) => l.kind === k).length]}
          frustumCulled={false}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ the journal's rope, clips and ivy */

function ropeTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#cfcfcf";
  g.fillRect(0, 0, 64, 64);
  // twisted strands: diagonal bands with darker grooves
  for (let i = -64; i < 128; i += 16) {
    const grad = g.createLinearGradient(i, 0, i + 16, 0);
    grad.addColorStop(0, "#7a7a7a");
    grad.addColorStop(0.5, "#ffffff");
    grad.addColorStop(1, "#7a7a7a");
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(i, 64);
    g.lineTo(i + 16, 64);
    g.lineTo(i + 16 + 32, 0);
    g.lineTo(i + 32, 0);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

type IvyLeaf = { pos: THREE.Vector3; angle: number; size: number; tint: number; tilt: number };

/** Rope, clips and ivy, modelled in track pixels (y down) and placed over the gallery as it slides. */
function JournalRope({ theme }: { theme: Theme }) {
  const { size } = useThree();
  const halfW = HALF_H * (size.width / Math.max(1, size.height));
  const group = useRef<THREE.Group>(null);
  const layout = journal.layout;
  const ropeTex = useMemo(() => ropeTexture(), []);
  const reveal = useMemo(() => ({ value: 1e9 }), []);
  const clip = useMemo(() => ({ value: new THREE.Vector2(-1e9, 1) }), []);
  const ropeMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: ropeTex, bumpMap: ropeTex, bumpScale: 1.5, roughness: 0.9 });
    // the rope runs in from the right as the scene arrives; left of the gallery it thins out (a dithered fade)
    m.onBeforeCompile = (s) => {
      s.uniforms.uReveal = reveal;
      s.uniforms.uClip = clip;
      s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying float vWX;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWX = (modelMatrix * vec4(transformed, 1.0)).x;");
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vWX; uniform float uReveal; uniform vec2 uClip;")
        .replace(
          "#include <clipping_planes_fragment>",
          "#include <clipping_planes_fragment>\nif (vWX < uReveal) discard;\nfloat keep = clamp((vWX - uClip.x) / uClip.y, 0.0, 1.0);\nif (keep < fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453)) discard;",
        );
    };
    m.customProgramCacheKey = () => "rope";
    return m;
  }, [ropeTex, reveal, clip]);
  const built = useMemo(() => {
    if (!layout) return null;
    const pts: THREE.Vector3[] = [];
    for (let x = layout.ropeFrom; x <= layout.ropeTo; x += 30) pts.push(new THREE.Vector3(x, -layout.rope(x), 0));
    const curve = new THREE.CatmullRomCurve3(pts);
    const length = layout.ropeTo - layout.ropeFrom;
    const rope = new THREE.TubeGeometry(curve, Math.min(1400, Math.round(length / 6)), 3.2, 8, false);
    // repeat the strand texture along the rope
    const uv = rope.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (length / 14), uv.getY(i));
    // ivy: a few stretches where a thin stem twines round the rope, with small leaves
    const ivy: { geo: THREE.TubeGeometry; leaves: IvyLeaf[] }[] = [];
    const r = seeded(808);
    const stretches = [
      [layout.photos[0].x - 260, layout.photos[0].x - 30],
      [layout.photos[2].x + 50, layout.photos[3].x - 40],
      [layout.photos[4].x + 40, layout.photos[5].x - 60],
      [layout.photos[5].x + 40, layout.photos[5].x + 300],
    ];
    for (const [a, b] of stretches) {
      const ip: THREE.Vector3[] = [];
      for (let x = a; x <= b; x += 6) {
        const th = x * 0.09;
        ip.push(new THREE.Vector3(x, -layout.rope(x) + Math.sin(th) * 5, Math.cos(th) * 5));
      }
      const c = new THREE.CatmullRomCurve3(ip);
      const leaves: IvyLeaf[] = [];
      for (let x = a + 12; x < b; x += 22 + r() * 14) {
        const side = leaves.length % 2 ? 1 : -1;
        leaves.push({ pos: new THREE.Vector3(x, -layout.rope(x) + side * 3, 8), angle: side > 0 ? 0.3 + r() * 0.7 : Math.PI - 0.3 - r() * 0.7, size: 16 + r() * 16, tint: Math.floor(r() * 5), tilt: (r() - 0.5) * 0.8 });
      }
      ivy.push({ geo: new THREE.TubeGeometry(c, Math.round((b - a) / 4), 1.4, 5, false), leaves });
    }
    return { rope, ivy };
  }, [layout]);
  const clipMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.6 }), []);
  const springMat = useMemo(() => new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.35 }), []);
  const ivyMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.7 }), []);
  const leafRef = useRef<THREE.InstancedMesh>(null);
  const heartGeo = useMemo(() => leafGeometry("heart"), []);
  const heartMat = useMemo(() => leafMaterial("heart"), []);
  const clips = useRef<THREE.Group[]>([]);
  const allLeaves = useMemo(() => (built ? built.ivy.flatMap((s) => s.leaves) : []), [built]);
  useEffect(() => {
    ropeMat.color.set(theme.journal.rope);
    clipMat.color.set(theme.journal.clip);
    springMat.color.set(theme.journal.spring);
    ivyMat.color.set(theme.vine);
    heartMat.roughness = theme.leaf.roughness;
    heartMat.sheenColor.set(theme.leaf.sheen);
    const m = leafRef.current;
    if (m) {
      allLeaves.forEach((l, i) => m.setColorAt(i, tmp.c.set(theme.leaf.colors[l.tint % theme.leaf.colors.length])));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }, [theme, ropeMat, clipMat, springMat, ivyMat, heartMat, allLeaves]);

  useFrame(() => {
    const g = group.current;
    if (!g || !layout || !built) return;
    const on = journal.enter > 0.001;
    g.visible = on;
    if (!on) return;
    // pixels to world: one uniform scale, y already flipped in the model
    const s = (2 * halfW) / innerWidth;
    toWorld(journal.track.left, journal.track.top, tmp.v, halfW);
    g.position.set(tmp.v.x, tmp.v.y, 0);
    g.scale.setScalar(s);
    // the rope draws in from the right edge of the screen to the left as the scene arrives
    reveal.value = halfW - easeInOutCubic(journal.enter) * (2 * halfW + 0.2) - (journal.enter >= 1 ? 1e6 : 0);
    const t = garden.clock;
    const clipX = toWorld(journal.clipLeft, 0, tmp.v, halfW).x;
    clip.value.set(clipX, Math.max(0.001, journal.clipFade * s));
    // pegs and ivy leaves left of the gallery's edge shrink away with the fade
    const fadeAt = (px: number) => smooth(journal.clipLeft, journal.clipLeft + journal.clipFade, journal.track.left + px);
    layout.photos.forEach((p, i) => {
      const c = clips.current[i];
      if (!c) return;
      c.position.set(p.x, -p.clipY, 6);
      c.rotation.z = THREE.MathUtils.degToRad(-(p.rot + journal.swing[i]));
      const shown = smooth(0.35 + i * 0.07, 0.55 + i * 0.07, journal.enter);
      c.scale.setScalar(Math.max(0.0001, shown * fadeAt(p.x)));
    });
    const m = leafRef.current;
    if (m) {
      const grow = smooth(0.4, 0.95, journal.enter);
      allLeaves.forEach((l, i) => {
        const o = tmp.o;
        o.position.copy(l.pos);
        o.rotation.set(l.tilt + (garden.reduced ? 0 : 0.1 * Math.sin(t * 1.3 + i)), 0.3, l.angle - Math.PI / 2);
        o.scale.setScalar(Math.max(0.0001, l.size * grow * fadeAt(l.pos.x)));
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    }
  });

  if (!layout || !built) return null;
  return (
    <group ref={group}>
      <mesh geometry={built.rope} material={ropeMat} />
      {built.ivy.map((s, i) => (
        <mesh key={i} geometry={s.geo} material={ivyMat} />
      ))}
      <instancedMesh ref={leafRef} args={[heartGeo, heartMat, Math.max(1, allLeaves.length)]} frustumCulled={false} />
      {layout.photos.map((p, i) => (
        <group
          key={i}
          ref={(g) => {
            if (g) clips.current[i] = g;
          }}
        >
          {/* a wooden clothes peg gripping the rope and the print's top edge, its steel spring across the middle */}
          <RoundedBox args={[11, 46, 4]} radius={1.6} smoothness={3} position={[0, 10, 3]} material={clipMat} />
          <RoundedBox args={[11, 46, 4]} radius={1.6} smoothness={3} position={[0, 10, -3]} material={clipMat} />
          <mesh position={[0, 4, 0]} rotation-y={Math.PI / 2} material={springMat}>
            <torusGeometry args={[5.4, 1.1, 6, 18]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ the scene */

export function Foreground({ theme, lite, portrait, layoutKey }: { theme: Theme; lite: boolean; portrait: React.RefObject<HTMLElement | null>; layoutKey: number }) {
  return (
    <>
      <hemisphereLight args={[theme.light.ambientSky, theme.light.ambientGround, theme.light.ambient * 1.1]} />
      <directionalLight position={theme.light.sun.position} color={theme.light.sun.color} intensity={theme.light.sun.intensity} />
      <directionalLight position={theme.light.rim.position} color={theme.light.rim.color} intensity={theme.light.rim.intensity * 0.6} />
      <Vines theme={theme} lite={lite} />
      <FrameLeaves portrait={portrait} theme={theme} />
      <JournalRope key={layoutKey} theme={theme} />
    </>
  );
}

export const FORE_CAM = CAM;
