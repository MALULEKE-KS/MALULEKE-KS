// lib/home/orbit-geometry.ts
// The Orbit's geometry (D-069), shared by the server-drawn still (OrbitPoster, the first frame and
// the fallback when WebGL isn't there) and the live scene (components/home/orbit/engine.ts), so the
// two line up when one fades into the other. Pure: no DOM, no randomness that isn't seeded.

export type Vec3 = [number, number, number];

/** One ring per home: radius, tilt (about x), roll (about z), angular speed (rad/s). Outer = the first home. */
export const RINGS: { r: number; tilt: number; roll: number; speed: number }[] = [
  { r: 1.08, tilt: 0.36, roll: -0.12, speed: 0.045 },
  { r: 0.76, tilt: 1.02, roll: -0.25, speed: -0.075 },
  { r: 0.46, tilt: -0.82, roll: 0.35, speed: 0.13 },
];
/** A home past the third shares the rings again, a little further out each time round. */
export function ring(home: number) {
  const base = RINGS[home % RINGS.length]!;
  const lap = Math.floor(home / RINGS.length);
  return { ...base, r: base.r + lap * 0.22, tilt: base.tilt + lap * 0.4 };
}

export const CORE_RADIUS = 0.2;
export const START = { yaw: 0.6, pitch: 0.34 };
export const FOV = (34 * Math.PI) / 180;

export const rotX = (p: Vec3, a: number): Vec3 => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
};
export const rotY = (p: Vec3, a: number): Vec3 => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};
export const rotZ = (p: Vec3, a: number): Vec3 => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
};
export const norm = (p: Vec3): Vec3 => {
  const l = Math.hypot(p[0], p[1], p[2]) || 1;
  return [p[0] / l, p[1] / l, p[2] / l];
};

/** A point on a home's ring at angle `a`, at radius `rr` (the ring's own unless given) and height `y` off its plane. */
export function ringPoint(home: number, a: number, rr?: number, y = 0): Vec3 {
  const g = ring(home);
  const r = rr ?? g.r;
  return rotZ(rotX([Math.cos(a) * r, y, Math.sin(a) * r], g.tilt), g.roll);
}

/** Where each system starts on its ring: spaced evenly round its home, each home turned a little from the last. */
export function startAngle(indexInHome: number, countInHome: number, home: number) {
  return (indexInHome / Math.max(1, countInHome)) * Math.PI * 2 + home * 1.3;
}

/** A world's radius from its commits over the window: a floor for quiet work, growing with the square root. */
export const worldRadius = (commits: number) => 0.03 + Math.sqrt(Math.max(0, commits)) * 0.0024;

/** Evenly spread unit vectors (a Fibonacci sphere). */
export function fibonacci(n: number): Vec3[] {
  const out: Vec3[] = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    out.push([Math.cos(g * i) * r, y, Math.sin(g * i) * r]);
  }
  return out;
}

/** A small seeded generator (Park–Miller), so the server's still and the browser's scene agree. */
export function seeded(seed = 11) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// ---- column-major 4×4 matrices ----
export type Mat4 = Float32Array;
export function mul(a: Mat4, b: Mat4): Mat4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let v = 0;
      for (let k = 0; k < 4; k++) v += a[k * 4 + r]! * b[c * 4 + k]!;
      o[c * 4 + r] = v;
    }
  return o;
}
export function perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
  const t = 1 / Math.tan(fovy / 2);
  const o = new Float32Array(16);
  o[0] = t / aspect;
  o[5] = t;
  o[10] = (far + near) / (near - far);
  o[11] = -1;
  o[14] = (2 * far * near) / (near - far);
  return o;
}
const mx = (a: number) => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
};
const my = (a: number) => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
};
const mt = (x: number, y: number, z: number) =>
  new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);

export interface Camera {
  yaw: number;
  pitch: number;
  dist: number;
  target: Vec3;
}
/** The view and projection-view matrices for a camera looking at `target` from `dist`. */
export function matrices(cam: Camera, aspect: number) {
  const V = mul(
    mt(0, 0, -cam.dist),
    mul(mx(cam.pitch), mul(my(cam.yaw), mt(-cam.target[0], -cam.target[1], -cam.target[2])))
  );
  return { V, PV: mul(perspective(FOV, aspect, 0.1, 80), V) };
}
/** Screen position (CSS px) and depth of a point; `shift` moves the scene's centre on screen (in clip units). */
export function project(
  PV: Mat4,
  p: Vec3,
  w: number,
  h: number,
  shift: [number, number] = [0, 0]
): [number, number, number] {
  const x = PV[0]! * p[0] + PV[4]! * p[1] + PV[8]! * p[2] + PV[12]!;
  const y = PV[1]! * p[0] + PV[5]! * p[1] + PV[9]! * p[2] + PV[13]!;
  const q = PV[3]! * p[0] + PV[7]! * p[1] + PV[11]! * p[2] + PV[15]!;
  return [(x / q + shift[0] + 1) * 0.5 * w, (1 - (y / q + shift[1])) * 0.5 * h, q];
}
/** How far the camera stands so the outer ring spans `ringPx` on a stage `h` px tall. */
export function distanceFor(ringPx: number, h: number, outer = RINGS[0]!.r) {
  return (outer * 1.22 * (h / 2)) / Math.tan(FOV / 2) / Math.max(40, ringPx);
}
