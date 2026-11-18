"use client";

/* eslint-disable react-hooks/immutability -- three.js objects are driven per frame by design */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { leafGeometry, leafMaterial, type LeafKind } from "./leaves";
import { clamp01, easeInOutCubic, garden, seeded, smooth } from "./store";
import type { Theme } from "./theme";

/*
 * The garden behind the words. A sky dome with a soft sun, shafts of light, layers of foliage receding into the
 * haze, drifting pollen, and the opening: leaves carried in on the wind from every side, tumbling, slowing and
 * settling into a loose wreath around the name, then hanging there, breathing in the breeze. Scrolling walks the
 * camera forward into it, so near leaves slide past faster than far ones.
 */

export const BACK_CAM = { z: 8, fov: 38 };

/* ------------------------------------------------------------------ sky, sun and light shafts */

const SKY_VERT = /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FRAG = /* glsl */ `
uniform vec3 uTop, uBottom, uGlow; uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  float y = vDir.y * 0.5 + 0.5;
  vec3 c = mix(uBottom, uTop, smoothstep(0.2, 0.85, y));
  float sun = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
  c += uGlow * (pow(sun, 18.0) * 0.55 + pow(sun, 4.0) * 0.18);
  gl_FragColor = vec4(c, 1.0);
}`;

function Sky({ theme }: { theme: Theme }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uTop: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() } },
      }),
    [],
  );
  useEffect(() => {
    mat.uniforms.uTop.value.set(theme.sky[0]);
    mat.uniforms.uBottom.value.set(theme.sky[1]);
    mat.uniforms.uGlow.value.set(theme.sunGlow);
    mat.uniforms.uSunDir.value.set(...theme.light.sun.position).normalize();
  }, [theme, mat]);
  return (
    <mesh material={mat} scale={60}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  );
}

function beamTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d")!;
  const across = g.createLinearGradient(0, 0, 64, 0);
  across.addColorStop(0, "rgba(255,255,255,0)");
  across.addColorStop(0.5, "rgba(255,255,255,1)");
  across.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = across;
  g.fillRect(0, 0, 64, 256);
  g.globalCompositeOperation = "destination-in";
  const along = g.createLinearGradient(0, 0, 0, 256);
  along.addColorStop(0, "rgba(0,0,0,0.9)");
  along.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = along;
  g.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}

/** Shafts of light falling from the sun's side, slowly breathing. */
function Beams({ theme }: { theme: Theme }) {
  const tex = useMemo(() => beamTexture(), []);
  const group = useRef<THREE.Group>(null);
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);
  const beams = useMemo(() => {
    const r = seeded(31);
    return Array.from({ length: 6 }, (_, i) => ({ x: -3 + i * 1.3 + r() * 0.6, w: 0.5 + r() * 1.1, phase: r() * 6.28, z: -3.5 - r() * 2 }));
  }, []);
  useFrame(() => {
    const t = garden.reduced ? 0 : garden.clock;
    const side = Math.sign(theme.light.sun.position[0]) || -1;
    if (group.current) group.current.rotation.z = side * 0.5;
    mats.current.forEach((m, i) => {
      if (!m) return;
      m.color.set(theme.beams.color);
      m.opacity = theme.beams.opacity * (0.7 + 0.3 * Math.sin(t * 0.3 + beams[i].phase)) * (1 - 0.6 * garden.intro);
    });
  });
  return (
    <group ref={group} position={[0, 2.5, 0]}>
      {beams.map((b, i) => (
        <mesh key={i} position={[b.x, -2, b.z]}>
          <planeGeometry args={[b.w, 11]} />
          <meshBasicMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            map={tex}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ pollen */

const POLLEN_VERT = /* glsl */ `
uniform float uTime; uniform float uScale;
attribute vec4 aSeed;
varying float vA;
void main() {
  vec3 p = position;
  p.y += mod(uTime * (0.05 + 0.08 * aSeed.x) + aSeed.y * 7.0, 7.0) - 3.5;
  p.x += sin(uTime * (0.3 + aSeed.z * 0.4) + aSeed.w * 6.28) * 0.25;
  p.z += cos(uTime * (0.25 + aSeed.x * 0.3) + aSeed.y * 6.28) * 0.2;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (1.2 + 2.4 * aSeed.z) * uScale / -mv.z;
  vA = 0.35 + 0.65 * aSeed.w;
  gl_Position = projectionMatrix * mv;
}`;
const POLLEN_FRAG = /* glsl */ `
uniform vec3 uColor; varying float vA;
void main() { float d = length(gl_PointCoord - 0.5); float a = exp(-d * d * 16.0) * vA; gl_FragColor = vec4(uColor * a, a); }`;

function Pollen({ theme, count }: { theme: Theme; count: number }) {
  const { size } = useThree();
  const geo = useMemo(() => {
    const r = seeded(77);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3), seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      pos.set([(r() - 0.5) * 14, (r() - 0.5) * 7, -7 + r() * 11], i * 3);
      seed.set([r(), r(), r(), r()], i * 4);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    return g;
  }, [count]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: POLLEN_VERT,
        fragmentShader: POLLEN_FRAG,
        uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uColor: { value: new THREE.Color() } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useFrame(() => {
    mat.uniforms.uTime.value = garden.reduced ? 0 : garden.clock;
    mat.uniforms.uScale.value = size.height * 0.012;
    mat.uniforms.uColor.value.set(theme.pollen);
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ leaves */

type LeafSpec = {
  kind: LeafKind;
  target: THREE.Vector3;
  rot: THREE.Euler;
  scale: number;
  tint: number;
  /** Arrival: when it sets off, how long it flies, where from, and how it tumbles on the way. */
  delay: number;
  flight: number;
  from: THREE.Vector3;
  swirl: THREE.Vector3;
  spin: THREE.Vector3;
  phase: number;
  /** How strongly scroll pushes it outward (near leaves more). */
  depth: number;
  far?: boolean;
};

/** The wreath: leaves around the name, clear of the words, spread in depth so they parallax. */
function wreathLeaves(aspect: number, count: number): LeafSpec[] {
  const r = seeded(9);
  const halfH = BACK_CAM.z * Math.tan(THREE.MathUtils.degToRad(BACK_CAM.fov / 2));
  const halfW = halfH * aspect;
  // the words occupy the middle of the frame; keep that clear
  const clearW = Math.min(halfW * 0.72, 3.6), clearH = Math.min(halfH * 0.42, 1.25);
  const out: LeafSpec[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 40) {
    const z = -2.8 + r() * 4.6;
    const k = (BACK_CAM.z - z) / BACK_CAM.z; // how much bigger the frame is at that depth
    // gather toward the words: most leaves in a band just outside the clear area
    const a = r() * Math.PI * 2;
    const band = 1.0 + Math.pow(r(), 1.8) * 1.2;
    const x = Math.cos(a) * clearW * band * 1.02 * k;
    const y = Math.sin(a) * clearH * band * 1.25 * k + (r() - 0.5) * 0.4;
    const sx = x / k, sy = y / k; // where it lands on screen, at the words' depth
    if (Math.abs(sx) < clearW && Math.abs(sy) < clearH) continue;
    if (Math.abs(sx) > halfW * 1.08 || Math.abs(sy) > halfH * 1.08) continue;
    const kinds: LeafKind[] = ["ovate", "ovate", "lance", "heart", "fern"];
    const kind = kinds[Math.floor(r() * kinds.length)];
    const dir = new THREE.Vector3(Math.cos(a) * 1.4 + (r() - 0.5), Math.sin(a) * 0.8 + (r() - 0.2), (r() - 0.5) * 0.6).normalize();
    out.push({
      kind,
      target: new THREE.Vector3(x, y, z),
      rot: new THREE.Euler((r() - 0.5) * 1.1, (r() - 0.5) * 1.2, a - Math.PI / 2 + (r() - 0.5) * 1.6),
      scale: (kind === "fern" ? 0.9 : 0.42) * (0.75 + r() * 0.6),
      tint: Math.floor(r() * 5),
      delay: 0.25 + 3.0 * Math.pow(out.length / count, 0.85) + r() * 0.35,
      flight: 2.1 + r() * 1.3,
      from: dir.multiplyScalar(8 + r() * 5),
      swirl: new THREE.Vector3((r() - 0.5) * 3, 1.5 + r() * 2.5, (r() - 0.5) * 2),
      spin: new THREE.Vector3((r() - 0.5) * 9, (r() - 0.5) * 9, (r() - 0.5) * 7),
      phase: r() * 6.28,
      depth: 0.4 + (z + 2.8) / 4.6,
    });
  }
  return out;
}

/** Foliage receding into the haze around the edges of the view, for depth. */
function gardenLeaves(aspect: number, count: number): LeafSpec[] {
  const r = seeded(4242);
  const out: LeafSpec[] = [];
  for (let i = 0; i < count; i++) {
    const z = -4 - r() * 11;
    const halfH = (BACK_CAM.z - z) * Math.tan(THREE.MathUtils.degToRad(BACK_CAM.fov / 2));
    const halfW = halfH * aspect;
    // mostly in from the sides and down from the top; a few low across the bottom
    const side = r();
    const x = side < 0.38 ? -halfW * (0.55 + r() * 0.55) : side < 0.76 ? halfW * (0.55 + r() * 0.55) : (r() - 0.5) * halfW * 2;
    const y = side < 0.76 ? (r() - 0.35) * halfH * 2 : (r() < 0.5 ? -1 : 1) * halfH * (0.6 + r() * 0.5);
    const kinds: LeafKind[] = ["ovate", "heart", "fern", "fern", "lance"];
    const kind = kinds[Math.floor(r() * kinds.length)];
    out.push({
      kind,
      target: new THREE.Vector3(x, y, z),
      rot: new THREE.Euler((r() - 0.5) * 0.8, (r() - 0.5) * 1.2, Math.atan2(-y, -x) + Math.PI / 2 + (r() - 0.5) * 1.2),
      scale: (kind === "fern" ? 2.4 : 1.2) * (0.6 + r() * 0.8),
      tint: Math.floor(r() * 5),
      delay: 0,
      flight: 0,
      from: new THREE.Vector3(),
      swirl: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      phase: r() * 6.28,
      depth: 0.15,
      far: true,
    });
  }
  return out;
}

const tmp = { o: new THREE.Object3D(), p: new THREE.Vector3(), c: new THREE.Color(), e: new THREE.Euler(), s: new THREE.Vector3() };

/** A click's gust spreads across the screen as a ring (ndc units per second) and is felt as its front passes. */
const RIPPLE_SPEED = 2.4;
const RIPPLE_WIDTH = 0.22;

/** One instanced mesh per leaf kind, posed every frame from the specs. */
function LeafField({ specs, kind, theme, shadows }: { specs: LeafSpec[]; kind: LeafKind; theme: Theme; shadows: boolean }) {
  const mine = useMemo(() => specs.filter((s) => s.kind === kind), [specs, kind]);
  const geo = useMemo(() => leafGeometry(kind), [kind]);
  const mat = useMemo(() => leafMaterial(kind), [kind]);
  const ref = useRef<THREE.InstancedMesh>(null);
  // the wind's effect on each leaf: where it has been blown to, how it is moving and spinning, how stirred it
  // still is, and the last gust that reached it. Leaves don't spring back: they drift and settle where they land.
  const blown = useMemo(
    () => mine.map(() => ({ off: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Vector3(), spin: new THREE.Vector3(), stir: 0, last: -1 })),
    [mine],
  );

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    mat.roughness = theme.leaf.roughness;
    mat.sheenColor.set(theme.leaf.sheen);
    mat.emissive.set(theme.leaf.colors[2]);
    mat.emissiveIntensity = theme.leaf.glow;
    mine.forEach((s, i) => {
      tmp.c.set(theme.leaf.colors[s.tint % theme.leaf.colors.length]);
      if (s.far) tmp.c.multiplyScalar(0.72);
      m.setColorAt(i, tmp.c);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [theme, mine, mat]);

  useFrame(({ camera }, delta) => {
    const m = ref.current;
    if (!m) return;
    const dt = Math.min(delta, 0.05);
    const t = garden.clock;
    const calm = garden.reduced;
    const push = easeInOutCubic(garden.intro);
    const gusts = garden.gusts.filter((g) => t - g.t < 3);
    const o = tmp.o;
    mine.forEach((s, i) => {
      // the flight in: along a curve bent by the wind, slowing as it arrives
      const k = calm || s.far ? 1 : clamp01((t - s.delay) / s.flight);
      const e = 1 - (1 - k) ** 3;
      const p = tmp.p.copy(s.target).addScaledVector(s.from, 1 - e).addScaledVector(s.swirl, Math.sin(Math.PI * e) * 0.5 * (1 - e * 0.4));
      // then hanging in the breeze
      const sway = calm ? 0 : 1;
      p.x += sway * 0.05 * Math.sin(t * 0.6 + s.phase);
      p.y += sway * 0.07 * Math.sin(t * 0.5 + s.phase * 1.3);
      // scrolling: near leaves drift outward faster as the camera walks in
      p.x *= 1 + push * 0.5 * s.depth;
      p.y *= 1 + push * 0.35 * s.depth;
      // a click's gust: a ripple of wind spreads out from the click across the whole screen; as its front reaches
      // a leaf, the leaf is kicked away from the click and tumbles, wanders a little while it's stirred up, then
      // slows and settles wherever it ends up
      const w = blown[i];
      if (!s.far && !calm) {
        if (gusts.length) {
          tmp.s.copy(p).add(w.off).project(camera);
          for (const g of gusts) {
            if (g.t <= w.last) continue;
            const dx = tmp.s.x - g.x, dy = tmp.s.y - g.y;
            const d = Math.hypot(dx * (camera as THREE.PerspectiveCamera).aspect, dy);
            const front = (t - g.t) * RIPPLE_SPEED;
            if (d > front || d < front - RIPPLE_WIDTH * 4) continue;
            w.last = g.t;
            const len = Math.hypot(dx, dy) || 1;
            const force = (1.6 / (1 + d * 1.2)) * (0.6 + s.depth * 0.6);
            const r = (n: number) => Math.sin(s.phase * 13.7 + g.t * 7.1 + n * 3.3);
            w.vel.x += (dx / len) * force + r(1) * 0.5;
            w.vel.y += (dy / len) * force * 0.8 + 0.35 + r(2) * 0.4;
            w.vel.z += r(3) * 0.6;
            w.spin.set(w.spin.x + r(4) * 5, w.spin.y + r(5) * 5, w.spin.z + r(6) * 6);
            w.stir = 1;
          }
        }
        if (w.stir > 0.001 || w.vel.lengthSq() > 1e-6) {
          // stirred: a wandering eddy that fades as the leaf calms down
          w.vel.x += Math.sin(t * 1.7 + s.phase * 3) * 0.9 * w.stir * dt;
          w.vel.y += Math.cos(t * 1.3 + s.phase * 5) * 0.7 * w.stir * dt;
          w.vel.multiplyScalar(Math.exp(-1.5 * dt));
          w.spin.multiplyScalar(Math.exp(-1.8 * dt));
          w.off.addScaledVector(w.vel, dt);
          w.rot.addScaledVector(w.spin, dt);
          w.stir *= Math.exp(-0.45 * dt);
          // keep them in the garden: a soft pull back once one has wandered far
          const far = w.off.length();
          if (far > 2.2) w.off.multiplyScalar(1 - (far - 2.2) * 0.5 * dt);
        }
        p.add(w.off);
      }
      const spinX = w.rot.x, spinY = w.rot.y;
      const spin = w.rot.z;
      o.position.copy(p);
      tmp.e.set(
        s.rot.x + (1 - e) * s.spin.x + sway * 0.12 * Math.sin(t * 0.8 + s.phase) + spinX,
        s.rot.y + (1 - e) * s.spin.y + sway * 0.1 * Math.sin(t * 0.7 + s.phase * 2) + spinY,
        s.rot.z + (1 - e) * s.spin.z + sway * 0.06 * Math.sin(t * 0.45 + s.phase) + spin,
      );
      o.rotation.copy(tmp.e);
      // not yet in: tiny and far away (it starts offscreen anyway)
      o.scale.setScalar(s.scale * (k <= 0 ? 0.0001 : 1));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  if (mine.length === 0) return null;
  return <instancedMesh ref={ref} args={[geo, mat, mine.length]} castShadow={shadows} receiveShadow={shadows} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ camera */

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const pointer = useMemo(() => ({ x: 0, y: 0 }), []);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1;
      pointer.y = (e.clientY / innerHeight) * 2 - 1;
    };
    addEventListener("pointermove", move);
    return () => removeEventListener("pointermove", move);
  }, [pointer]);
  const eased = useMemo(() => ({ x: 0, y: 0 }), []);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 2);
    eased.x += (pointer.x - eased.x) * k;
    eased.y += (pointer.y - eased.y) * k;
    const walk = easeInOutCubic(garden.intro);
    const beyond = smooth(0, 1, garden.part);
    const drift = garden.reduced ? 0 : 1;
    camera.position.set(eased.x * 0.25 * drift, 0.05 + 0.3 * walk - eased.y * 0.15 * drift, BACK_CAM.z - 4.4 * walk - 1.4 * beyond);
    camera.lookAt(eased.x * 0.1, 0.05 + 0.15 * walk, -8);
  });
  return null;
}

/* ------------------------------------------------------------------ the scene */

export function Backdrop({ theme, lite }: { theme: Theme; lite: boolean }) {
  const { size, scene, gl } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const wreath = useMemo(() => wreathLeaves(aspect, lite ? 80 : 150), [aspect, lite]);
  const back = useMemo(() => gardenLeaves(aspect, lite ? 70 : 170), [aspect, lite]);
  const sun = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    scene.fog = new THREE.Fog(theme.fog.color, theme.fog.near, theme.fog.far);
    gl.toneMappingExposure = theme.exposure;
  }, [theme, scene, gl]);

  useFrame((_, dt) => {
    garden.clock += Math.min(dt, 0.1);
  });

  const kinds: LeafKind[] = ["ovate", "lance", "heart", "fern"];
  return (
    <>
      <CameraRig />
      <Sky theme={theme} />
      <hemisphereLight args={[theme.light.ambientSky, theme.light.ambientGround, theme.light.ambient]} />
      <directionalLight
        ref={sun}
        position={theme.light.sun.position}
        color={theme.light.sun.color}
        intensity={theme.light.sun.intensity}
        castShadow={!lite}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      <directionalLight position={theme.light.rim.position} color={theme.light.rim.color} intensity={theme.light.rim.intensity} />
      <Beams theme={theme} />
      <Pollen theme={theme} count={lite ? 220 : 520} />
      {kinds.map((k) => (
        <LeafField key={`b-${k}`} specs={back} kind={k} theme={theme} shadows={false} />
      ))}
      {kinds.map((k) => (
        <LeafField key={`w-${k}`} specs={wreath} kind={k} theme={theme} shadows={!lite} />
      ))}
    </>
  );
}
