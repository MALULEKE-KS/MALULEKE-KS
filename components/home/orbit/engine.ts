// components/home/orbit/engine.ts
// The Orbit's live scene (D-069), hand-written WebGL2 — no 3D library. Everything that only moves
// with time (the stars, the dust in each ring, the core's nucleus, shell, wind and flares, every
// world's lit particles, atmosphere, trail and halo, the technologies) lives in one static buffer
// on the graphics card and is moved there by a clock; the CPU moves only the worlds (a few dozen
// numbers) and the sparks. One draw call for the points, one for the threads. Downloaded only when
// the stage is on screen and the page has gone idle (OrbitStage), so the hero's words paint first.
//
// Every mark is the owner's data: a world is a published system on its home's ring, its mass its
// commits over 26 weeks, each spark one of those commits, replayed week by week.

import type { OrbitData } from "@/lib/queries/orbit";
import {
  CORE_RADIUS,
  START,
  distanceFor,
  fibonacci,
  matrices,
  norm,
  project,
  ring,
  ringPoint,
  rotY,
  seeded,
  startAngle,
  worldRadius,
  type Vec3,
} from "@/lib/home/orbit-geometry";

export interface OrbitLayout {
  /** The stage's centre, as a share of its width and height. */
  cx: number;
  cy: number;
  /** How wide the outer ring should be drawn, in CSS px. */
  ringPx: number;
  /** Where an opened world sits on screen (shares of width and height), clear of its panel. */
  focusX: number;
  focusY: number;
  /** The core never comes left of this (a share of the width): the words' column is the core's limit too. */
  minCoreX: number;
}

export interface OrbitFrame {
  phase: "arrive" | "replay" | "idle";
  /** The week being replayed (index into data.weeks), or -1. */
  week: number;
  /** Commits replayed so far. */
  sent: number;
  /** Each world's place on screen: CSS px, its drawn radius, and its depth. */
  worlds: { x: number; y: number; r: number; depth: number }[];
  core: { x: number; y: number; scale: number; flash: number };
  grown: boolean;
}

export interface OrbitEngine {
  resize(w: number, h: number, dpr: number, layout: OrbitLayout): void;
  focus(index: number | null): void;
  hover(index: number | null): void;
  tech(name: string | null): void;
  /** The world named in the hero's latest-commit line, or null. */
  beacon(index: number | null): void;
  replay(fromWeek?: number): void;
  /** The world under a point (CSS px), with a finger's reach when `touch`. */
  pick(x: number, y: number, touch: boolean): number | null;
  turn(dyaw: number, dpitch: number): void;
  fling(vyaw: number): void;
  start(): void;
  stop(): void;
  destroy(): void;
}

const MAX_WORLDS = 32;
const MAX_TECH = 32;
const MAX_IMPACTS = 16;
const ARRIVE = 1.8;
const F = 12; // floats per vertex

// ---------------------------------------------------------------- shaders
const VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aA; // kind, index, p0, p1
layout(location=1) in vec4 aB; // xyz, p2
layout(location=2) in vec4 aC; // extra
uniform mat4 uPV; uniform vec2 uShift; uniform float uScale; uniform float uFocus; uniform float uDof;
uniform float uTime; uniform float uGrow; uniform float uFlash; uniform float uCoreDim; uniform float uQ; uniform float uSky;
uniform vec4 uRing[4]; uniform vec4 uRingDim;
uniform vec4 uW[${MAX_WORLDS}];  // pos.xyz, radius
uniform vec4 uWB[${MAX_WORLDS}]; // angle, ring, calm, flags (1 flagship, 2 active, 4 lit)
uniform float uWSpin[${MAX_WORLDS}];
uniform vec4 uImp[${MAX_IMPACTS}]; uniform int uImpN;
uniform vec4 uTech[${MAX_TECH / 4}];
uniform vec3 uRight; uniform vec3 uUp; uniform int uBeacon;
out vec4 vCol; out float vSoft;

const vec3 EMBER = vec3(1.0, 0.36, 0.12); const vec3 DEEP = vec3(0.75, 0.16, 0.04); const vec3 HOT = vec3(1.0, 0.84, 0.68);
const vec3 WHITE = vec3(1.0, 0.97, 0.92); const vec3 BONE = vec3(0.95, 0.94, 0.91); const vec3 LIVE = vec3(0.24, 0.86, 0.59);
const vec3 PEACH = vec3(1.0, 0.69, 0.54); const vec3 DUST = vec3(0.86, 0.8, 0.74); const vec3 SKY = vec3(0.85, 0.9, 1.0);

vec3 rotYv(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c); }
vec3 ringPt(int ri, float a, float rr, float y) {
  vec4 R = uRing[ri]; vec3 p = vec3(cos(a) * rr, y, sin(a) * rr);
  float c = cos(R.y), s = sin(R.y); p = vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
  c = cos(R.z); s = sin(R.z); return vec3(p.x * c - p.y * s, p.x * s + p.y * c, p.z);
}
float flag(float f, float bit) { return mod(floor(f / bit), 2.0); }

void main() {
  int kind = int(aA.x + 0.5); int idx = int(aA.y + 0.5);
  vec3 pos = vec3(0.0); float size = 0.02; vec3 col = BONE; float a = 0.0;
  float crot = uTime * 0.07; float R0 = ${CORE_RADIUS.toFixed(3)} * (0.3 + 0.7 * uGrow) * (1.0 + uFlash * 0.18);
  if (kind == 0) { // a far star
    pos = aB.xyz; size = 0.034; col = aC.rgb; a = aA.z * (0.72 + 0.28 * sin(uTime * 1.1 + aA.w)) * uSky;
  } else if (kind == 1) { // dust in a ring
    float ang = aA.z + uTime * uRing[idx].w * aA.w;
    pos = ringPt(idx, ang, uRing[idx].x * uGrow * (1.0 + aB.x), aB.y); size = 0.011; col = DUST; a = aB.z * uGrow * uRingDim[idx];
  } else if (kind == 2) { // a ring's faint line
    pos = ringPt(idx, aA.z, uRing[idx].x * uGrow, 0.0); size = 0.006; a = 0.07 * uGrow * uRingDim[idx];
  } else if (kind == 3) { // the core's rippling shell
    vec3 u = rotYv(aB.xyz, crot);
    float n = sin(u.x * 5.3 + uTime * 0.9) * sin(u.y * 4.1 - uTime * 0.7) * sin(u.z * 6.2 + uTime * 0.55) + 0.5 * sin(u.x * 11.0 + u.z * 9.0 + uTime * 1.6);
    float rip = 0.0;
    for (int i = 0; i < ${MAX_IMPACTS}; i++) { if (i >= uImpN) break; vec4 im = uImp[i]; float ang = acos(clamp(dot(u, im.xyz), -1.0, 1.0));
      rip += 0.14 * exp(-im.w * 2.6) * sin(im.w * 15.0 - ang * 9.0) * exp(-ang * ang * 2.5); }
    pos = u * R0 * (1.0 + 0.06 * n + rip);
    float heat = clamp(0.4 + n * 0.55 + rip * 3.0 + uFlash * 0.6, 0.0, 1.0);
    col = heat > 0.5 ? mix(EMBER, HOT, (heat - 0.5) * 2.0) : mix(DEEP, EMBER, heat * 2.0);
    size = 0.016 * uQ; a = 0.3 * uGrow * uCoreDim;
  } else if (kind == 4) { // the white-hot nucleus
    vec3 u = rotYv(aB.xyz, crot * 1.6); pos = u * R0 * (0.5 + 0.08 * sin(u.x * 7.0 + uTime * 1.7)); size = 0.022; col = WHITE; a = 0.24 * uGrow * uCoreDim;
  } else if (kind == 5) { // the solar wind
    float k = fract(aA.z + uTime * 0.1); vec3 u = rotYv(aB.xyz, crot * 0.6);
    pos = u * R0 * (1.04 + k * 1.15); size = 0.014 * (1.0 + k); col = mix(HOT, DEEP, k); a = 0.22 * (1.0 - k) * (1.0 - k) * uGrow * uCoreDim;
  } else if (kind == 6) { // a flare arching off the surface and back
    float s = aA.z; float h = aA.w * (0.55 + 0.45 * sin(uTime * (0.4 + aC.w * 0.08) + aC.w));
    vec3 d = rotYv(normalize(mix(aB.xyz, aC.xyz, s)), crot);
    pos = d * R0 * (1.0 + h * sin(3.14159265 * s)); size = 0.017; col = mix(HOT, EMBER, abs(s - 0.5) * 2.0); a = 0.45 * uGrow * uCoreDim;
  } else if (kind >= 7 && kind <= 11) { // a world: lit particles, atmosphere, halo, trail, active ring
    vec4 W = uW[idx]; vec4 B = uWB[idx]; float calm = B.z;
    bool flagship = flag(B.w, 1.0) > 0.5;
    vec3 wcol = flagship ? mix(EMBER, HOT, 0.25) : BONE;
    vec3 L = normalize(-W.xyz + vec3(0.0001));
    if (kind == 7) {
      float sp = uTime * uWSpin[idx]; float c = cos(sp), sn = sin(sp);
      vec3 d = vec3(aB.x * c - aB.z * sn, aB.y, aB.x * sn + aB.z * c);
      float lam = max(0.0, dot(d, L)); float b = 0.12 + 0.88 * pow(lam, 0.75);
      pos = W.xyz + d * W.w; size = 0.019; col = mix(DEEP, (flagship && aA.z > 0.5) ? HOT : wcol, min(1.0, b + 0.1)); a = (0.18 + 0.62 * b) * calm;
    } else if (kind == 8) {
      float lam = max(0.0, dot(aB.xyz, L)); pos = W.xyz + aB.xyz * W.w * 1.22; size = 0.016; col = flagship ? PEACH : SKY; a = 0.12 * (0.3 + lam) * calm;
    } else if (kind == 9) {
      pos = W.xyz; size = W.w * 6.5; col = flagship ? EMBER : BONE; a = 0.14 * calm;
      // "Now": the world named in the hero's latest-commit line breathes a beacon.
      if (idx == uBeacon) { float b = 0.5 + 0.5 * sin(uTime * 2.2); size *= 1.0 + 0.7 * b; a = (0.16 + 0.2 * b) * calm; col = HOT; }
    } else if (kind == 10) {
      int ri = int(B.y + 0.5); float k = aA.z; float dir = sign(uRing[ri].w);
      pos = ringPt(ri, B.x - dir * k * 0.015, uRing[ri].x * uGrow, 0.0);
      size = 0.013 * (1.0 - k / 72.0); col = flagship ? EMBER : BONE; a = 0.42 * pow(1.0 - k / 64.0, 2.2) * calm * uGrow;
    } else {
      if (flag(B.w, 2.0) < 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vCol = vec4(0.0); vSoft = 0.0; return; }
      float an = aA.z + uTime * 1.3; vec3 o = (uRight * cos(an) + uUp * sin(an)) * W.w * 2.2;
      pos = W.xyz + o; size = 0.011; col = LIVE; a = 0.55 * (0.6 + 0.4 * sin(an * 3.0 - uTime * 4.0)) * calm;
    }
  } else if (kind == 12) { // a technology on the far sky
    float on = uTech[idx / 4][idx % 4]; pos = aB.xyz; size = mix(0.028, 0.06, on); col = PEACH; a = mix(0.28 * uGrow, 0.95, on);
  } else { // 99 — drawn by the CPU this frame (sparks, bursts, shockwaves)
    pos = aB.xyz; size = aA.z; col = aC.rgb; a = aC.a;
  }
  vec4 p = uPV * vec4(pos, 1.0); p.xy += uShift * p.w; gl_Position = p;
  float blur = clamp(abs(p.w - uFocus) * uDof, 0.0, 2.4);
  gl_PointSize = a <= 0.003 ? 0.0 : clamp(size * uScale / p.w * (1.0 + blur * 0.85), 1.0, 128.0);
  vCol = vec4(col, a); vSoft = blur;
}`;
const FS = `#version 300 es
precision mediump float; in vec4 vCol; in float vSoft; out vec4 o;
void main() { vec2 c = gl_PointCoord * 2.0 - 1.0; float d = dot(c, c); if (d > 1.0 || vCol.a <= 0.003) discard;
  float core = smoothstep(0.3 + vSoft * 0.3, 0.0, d); float glow = max(exp(-d * (3.2 - vSoft * 0.9)) - 0.04, 0.0);
  float a = vCol.a * (core * 0.8 + glow * 0.5) / (1.0 + vSoft * 1.7); o = vec4(vCol.rgb * a, a); }`;
const LVS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec4 aCol; uniform mat4 uPV; uniform vec2 uShift; out vec4 vCol;
void main() { vec4 p = uPV * vec4(aPos, 1.0); p.xy += uShift * p.w; gl_Position = p; vCol = aCol; }`;
const LFS = `#version 300 es
precision mediump float; in vec4 vCol; out vec4 o; void main() { o = vec4(vCol.rgb * vCol.a, vCol.a); }`;

const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Compiles and links a program; where the driver compiles in parallel (KHR_parallel_shader_compile) it waits frame by frame instead of blocking. */
async function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  const shaders = (
    [
      [gl.VERTEX_SHADER, vs],
      [gl.FRAGMENT_SHADER, fs],
    ] as const
  ).map(([type, src]) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    gl.attachShader(p, sh);
    return sh;
  });
  gl.linkProgram(p);
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  if (parallel)
    while (!gl.getProgramParameter(p, parallel.COMPLETION_STATUS_KHR))
      await new Promise((r) => requestAnimationFrame(r));
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const why = shaders.map((sh) => gl.getShaderInfoLog(sh)).join(" ") || gl.getProgramInfoLog(p);
    throw new Error(why ?? "link");
  }
  return p;
}

// ---------------------------------------------------------------- the engine
export async function createOrbit(
  canvas: HTMLCanvasElement,
  data: OrbitData,
  opts: { reduced: boolean; quality: number; weekMs: number; sky: number; onFrame: (f: OrbitFrame) => void }
): Promise<OrbitEngine | null> {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
  });
  if (!gl) return null;
  let PP: WebGLProgram, LP: WebGLProgram;
  try {
    [PP, LP] = await Promise.all([compile(gl, VS, FS), compile(gl, LVS, LFS)]);
  } catch (err) {
    console.warn("[orbit] the live scene is off:", err);
    return null;
  }
  await pause();
  const q = opts.quality; // 1, or 0.5 on a small device — fewer particles, the same picture
  const rnd = seeded(11);
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const nWeeks = data.weeks.length;
  const sys = data.systems.slice(0, MAX_WORLDS);
  const tech = [...new Set(sys.flatMap((s) => s.stack))].slice(0, MAX_TECH);
  const techPos = fibonacci(Math.max(2, tech.length)).map(
    (d) => [d[0] * 1.95, d[1] * 1.2, d[2] * 1.95] as Vec3
  );
  const nHomes = Math.max(1, data.homes.length);
  const worlds = sys.map((s) => {
    const inHome = sys.filter((o) => o.home === s.home);
    const total = s.weeks.reduce((a, b) => a + b, 0);
    const recent = s.weeks.slice(-6).reduce((a, b) => a + b, 0);
    return {
      s,
      total,
      recent,
      angle: startAngle(inHome.indexOf(s), inHome.length, s.home),
      rs: worldRadius(total),
      pos: [0, 0, 0] as Vec3,
      dim: 0,
      spin: 0.25 + rnd() * 0.45,
      coursework: /coursework/i.test(s.status),
    };
  });

  // ---- the static buffer: built once
  const verts: number[] = [];
  const v = (
    kind: number,
    idx: number,
    p0: number,
    p1: number,
    b: Vec3 | number[],
    p2: number,
    c: number[] = [0, 0, 0, 0]
  ) => verts.push(kind, idx, p0, p1, b[0]!, b[1]!, b[2]!, p2, c[0]!, c[1]!, c[2]!, c[3]!);
  const n = (count: number) => Math.max(1, Math.round(count * q));
  for (const d of fibonacci(n(1100))) {
    const r = 7 + rnd() * 5;
    const c = rnd() > 0.85 ? [1, 0.69, 0.54] : rnd() > 0.7 ? [0.78, 0.85, 1] : [0.95, 0.94, 0.91];
    v(
      0,
      0,
      Math.pow(rnd(), 2.2) * 0.45 + 0.03,
      rnd() * 6.28,
      [d[0] * r + gauss() * 0.4, d[1] * r + gauss() * 0.4, d[2] * r],
      0,
      [...c, 0]
    );
  }
  for (let h = 0; h < nHomes; h++) {
    for (let i = 0; i < n(300); i++)
      v(
        1,
        h % 4,
        rnd() * Math.PI * 2,
        0.75 + rnd() * 0.5,
        [gauss() * 0.04, gauss() * 0.025, 0.05 + rnd() * 0.12],
        0
      );
    for (let i = 0; i < 200; i++) v(2, h % 4, (i / 200) * Math.PI * 2, 0, [0, 0, 0], 0);
  }
  await pause();
  for (const d of fibonacci(n(1700))) v(3, 0, 0, 0, d, 0);
  for (const d of fibonacci(n(520))) v(4, 0, 0, 0, d, 0);
  for (const d of fibonacci(n(950))) v(5, 0, rnd(), 0, d, 0);
  for (let f = 0; f < 6; f++) {
    const a = norm([gauss(), gauss() * 0.6, gauss()]);
    const b = norm([a[0] + gauss() * 0.35, a[1] + gauss() * 0.35, a[2] + gauss() * 0.35]);
    const h = 0.35 + rnd() * 0.5,
      ph = rnd() * 6.28;
    for (let j = 0; j <= 34; j++) v(6, 0, j / 34, h, a, 0, [b[0], b[1], b[2], ph]);
  }
  await pause();
  worlds.forEach((w, i) => {
    fibonacci(n(40 + Math.round(Math.sqrt(w.total) * 5))).forEach((d, j) =>
      v(7, i, j % 6 === 0 ? 1 : 0, 0, d, 0)
    );
    for (const d of fibonacci(n(46))) v(8, i, 0, 0, d, 0);
    v(9, i, 0, 0, [0, 0, 0], 0);
    for (let k = 1; k <= 64; k++) v(10, i, k, 0, [0, 0, 0], 0);
    for (let k = 0; k < 22; k++) v(11, i, (k / 22) * Math.PI * 2, 0, [0, 0, 0], 0);
  });
  tech.forEach((_, i) => v(12, i, 0, 0, techPos[i]!, 0));
  await pause();
  const staticData = new Float32Array(verts);
  const staticCount = staticData.length / F;

  const MAX_DYN = 9000;
  const dyn = new Float32Array(MAX_DYN * F);
  const MAX_LINES = 400;
  const lines = new Float32Array(MAX_LINES * 2 * 7);

  const sBuf = gl.createBuffer()!,
    dBuf = gl.createBuffer()!,
    lBuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, sBuf);
  gl.bufferData(gl.ARRAY_BUFFER, staticData, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, dBuf);
  gl.bufferData(gl.ARRAY_BUFFER, dyn.byteLength, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, lBuf);
  gl.bufferData(gl.ARRAY_BUFFER, lines.byteLength, gl.DYNAMIC_DRAW);
  const pointVao = (buf: WebGLBuffer) => {
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (let i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, F * 4, i * 16);
    }
    gl.bindVertexArray(null);
    return vao;
  };
  const sVao = pointVao(sBuf),
    dVao = pointVao(dBuf);
  const lVao = gl.createVertexArray()!;
  gl.bindVertexArray(lVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, lBuf);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
  gl.bindVertexArray(null);

  const u = (name: string) => gl.getUniformLocation(PP, name);
  const U = {
    pv: u("uPV"),
    shift: u("uShift"),
    scale: u("uScale"),
    focus: u("uFocus"),
    dof: u("uDof"),
    time: u("uTime"),
    grow: u("uGrow"),
    flash: u("uFlash"),
    coreDim: u("uCoreDim"),
    q: u("uQ"),
    sky: u("uSky"),
    ring: u("uRing"),
    ringDim: u("uRingDim"),
    w: u("uW"),
    wb: u("uWB"),
    wspin: u("uWSpin"),
    imp: u("uImp"),
    impN: u("uImpN"),
    tech: u("uTech"),
    right: u("uRight"),
    up: u("uUp"),
    beacon: u("uBeacon"),
    lpv: gl.getUniformLocation(LP, "uPV"),
    lshift: gl.getUniformLocation(LP, "uShift"),
  };
  const ringU = new Float32Array(16);
  for (let h = 0; h < 4; h++) {
    const g = ring(h);
    ringU.set([g.r, g.tilt, g.roll, g.speed], h * 4);
  }
  const wU = new Float32Array(MAX_WORLDS * 4),
    wbU = new Float32Array(MAX_WORLDS * 4),
    spinU = new Float32Array(MAX_WORLDS),
    impU = new Float32Array(MAX_IMPACTS * 4),
    techU = new Float32Array(MAX_TECH);
  worlds.forEach((w, i) => {
    spinU[i] = w.spin;
  });

  // ---- state
  const st = {
    w: 1,
    h: 1,
    dpr: 1,
    t: opts.reduced ? ARRIVE : 0,
    phase: (opts.reduced ? "idle" : "arrive") as OrbitFrame["phase"],
    clock: 0,
    week: -1,
    sent: 0,
    flash: 0,
    sx: 0,
    sy: 0,
    dof: 0.42,
  };
  const total = worlds.reduce((a, w) => a + w.total, 0);
  const weekTotals = data.weeks.map((_, i) => worlds.reduce((a, w) => a + (w.s.weeks[i] ?? 0), 0));
  const cam = {
    yaw: START.yaw,
    pitch: START.pitch,
    tyaw: START.yaw,
    tpitch: START.pitch,
    vyaw: 0,
    dist: 4,
    tdist: 4,
    base: 4,
    target: [0, 0, 0] as Vec3,
  };
  let layout: OrbitLayout = { cx: 0.5, cy: 0.5, ringPx: 200, focusX: 0.5, focusY: 0.5, minCoreX: 0 };
  let focused: number | null = null,
    hovered: number | null = null,
    techLit: string | null = null,
    beacon = -1;
  const pending: { w: number; at: number }[] = [];
  const sparks: { w: number; k: number; dur: number; lift: Vec3; from: Vec3 }[] = [];
  const impacts: { d: Vec3; age: number }[] = [];
  const bursts: { p: Vec3; v: Vec3; age: number }[] = [];
  const shocks: { w: number; age: number }[] = [];
  const weekS = opts.weekMs / 1000;
  const frameOut: OrbitFrame = {
    phase: st.phase,
    week: -1,
    sent: 0,
    worlds: worlds.map(() => ({ x: 0, y: 0, r: 0, depth: 1 })),
    core: { x: 0, y: 0, scale: 1, flash: 0 },
    grown: false,
  };

  const schedule = (week: number, at: number) =>
    worlds.forEach((w, i) => {
      for (let c = 0; c < (w.s.weeks[week] ?? 0); c++)
        pending.push({ w: i, at: at + rnd() * weekS });
    });
  const emit = (i: number) =>
    sparks.push({
      w: i,
      k: 0,
      dur: 1.05 + rnd() * 0.55,
      lift: [gauss() * 0.3, 0.32 + rnd() * 0.32, gauss() * 0.3],
      from: [...worlds[i]!.pos] as Vec3,
    });
  function replay(fromWeek = 0) {
    pending.length = 0;
    sparks.length = 0;
    st.phase = "replay";
    st.week = fromWeek - 1;
    st.clock = fromWeek * weekS;
    st.sent = weekTotals.slice(0, fromWeek).reduce((a, b) => a + b, 0);
  }

  // ---- one frame
  let dc = 0,
    lc = 0;
  const D = (p: Vec3, size: number, c: Vec3, a: number) => {
    if (dc >= MAX_DYN || a <= 0.003) return;
    const o = dc++ * F;
    dyn[o] = 99;
    dyn[o + 1] = 0;
    dyn[o + 2] = size;
    dyn[o + 3] = 0;
    dyn[o + 4] = p[0];
    dyn[o + 5] = p[1];
    dyn[o + 6] = p[2];
    dyn[o + 7] = 0;
    dyn[o + 8] = c[0];
    dyn[o + 9] = c[1];
    dyn[o + 10] = c[2];
    dyn[o + 11] = a;
  };
  const Ln = (p: Vec3, qq: Vec3, c: Vec3, a: number, b: number) => {
    if (lc >= MAX_LINES) return;
    lines.set(
      [p[0], p[1], p[2], c[0], c[1], c[2], a, qq[0], qq[1], qq[2], c[0], c[1], c[2], b],
      lc++ * 14
    );
  };
  const bez = (p0: Vec3, p1: Vec3, k: number): Vec3 => {
    const m = 1 - k;
    return [
      m * m * p0[0] + 2 * m * k * p1[0],
      m * m * p0[1] + 2 * m * k * p1[1],
      m * m * p0[2] + 2 * m * k * p1[2],
    ];
  };
  const HOT: Vec3 = [1, 0.84, 0.68],
    WHITE: Vec3 = [1, 0.97, 0.92],
    EMBER: Vec3 = [1, 0.36, 0.12],
    BONE: Vec3 = [0.95, 0.94, 0.91],
    PEACH: Vec3 = [1, 0.69, 0.54];
  const ease4 = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 4);

  function frame(dt: number) {
    if (!opts.reduced) st.t += dt;
    const T = st.t;
    if (st.phase === "arrive" && T > ARRIVE) replay(0);
    if (st.phase === "replay") {
      st.clock += dt;
      const wk = Math.min(nWeeks - 1, Math.floor(st.clock / weekS));
      while (st.week < wk) {
        st.week++;
        schedule(st.week, st.week * weekS);
      }
      for (let i = pending.length - 1; i >= 0; i--)
        if (pending[i]!.at <= st.clock) {
          emit(pending[i]!.w);
          st.sent++;
          pending.splice(i, 1);
        }
      if (st.clock > nWeeks * weekS + 1.2 && pending.length === 0) st.phase = "idle";
    } else if (st.phase === "idle" && !opts.reduced) {
      worlds.forEach((w, i) => {
        if (w.recent > 0 && rnd() < dt * Math.min(3.2, w.recent / 15)) emit(i);
      });
    }

    // camera: a slow drift, inertia after a drag, a flight to an opened world
    if (focused === null && !opts.reduced) {
      cam.tyaw += dt * 0.03 + cam.vyaw;
      cam.vyaw *= Math.pow(0.08, dt);
    }
    const e = opts.reduced ? 1 : 1 - Math.pow(0.004, dt);
    cam.yaw += (cam.tyaw - cam.yaw) * e;
    cam.pitch += (cam.tpitch - cam.pitch) * e;
    cam.dist += (cam.tdist - cam.dist) * e * 0.75;
    const grow = opts.reduced ? 1 : ease4(T / ARRIVE);

    // worlds move along their rings
    const slow = focused !== null ? 0.18 : 1;
    worlds.forEach((w, i) => {
      if (!opts.reduced) w.angle += dt * ring(w.s.home).speed * slow;
      w.pos = ringPoint(w.s.home, w.angle, ring(w.s.home).r * grow);
      w.dim += ((focused !== null && focused !== i ? 1 : 0) - w.dim) * e * 0.6;
    });
    const fp = focused !== null ? worlds[focused]!.pos : null;
    const tgt: Vec3 = fp ? [fp[0] * 0.5, fp[1] * 0.5, fp[2] * 0.5] : [0, 0, 0];
    for (let k = 0; k < 3; k++)
      cam.target[k] = cam.target[k]! + (tgt[k]! - cam.target[k]!) * e * 0.7;
    // An opened world is carried to its place on screen (clear of its panel) by shifting the scene; the
    // core is never carried into the words' column. Measured from the last frame, so it converges.
    let tsx = 2 * layout.cx - 1;
    let tsy = 1 - 2 * layout.cy;
    if (focused !== null && frameOut.worlds[focused]!.depth > 0) {
      const o = frameOut.worlds[focused]!;
      tsx = st.sx + (2 * (layout.focusX * st.w - o.x)) / st.w;
      tsy = st.sy + (2 * (o.y - layout.focusY * st.h)) / st.h;
      const coreX = frameOut.core.x + ((tsx - st.sx) * st.w) / 2;
      if (coreX < layout.minCoreX * st.w) tsx += (2 * (layout.minCoreX * st.w - coreX)) / st.w;
    }
    st.sx += (tsx - st.sx) * e * 0.8;
    st.sy += (tsy - st.sy) * e * 0.8;
    st.dof += ((focused !== null ? 1.1 : 0.42) - st.dof) * e * 0.6;
    const { PV, V } = matrices(
      { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, target: cam.target },
      st.w / st.h
    );
    const scalePx = (st.h * st.dpr * 0.5) / Math.tan((34 * Math.PI) / 360);
    const right: Vec3 = [V[0]!, V[4]!, V[8]!],
      up: Vec3 = [V[1]!, V[5]!, V[9]!];
    const lit = focused ?? hovered;

    // per-world uniforms
    worlds.forEach((w, i) => {
      const big =
        (i === lit || (techLit !== null && w.s.stack.includes(techLit)) ? 1.18 : 1) * grow;
      wU.set([w.pos[0], w.pos[1], w.pos[2], w.rs * big], i * 4);
      const calm = (w.coursework ? 0.62 : 1) * (1 - w.dim * 0.7);
      wbU.set(
        [w.angle, w.s.home % 4, calm, (w.s.flagship ? 1 : 0) + (w.recent > 0 ? 2 : 0)],
        i * 4
      );
      const [x, y, depth] = project(PV, w.pos, st.w, st.h, [st.sx, st.sy]);
      const o = frameOut.worlds[i]!;
      o.x = x;
      o.y = y;
      o.depth = depth;
      o.r = (w.rs * big * 1.3 * scalePx) / depth / st.dpr;
    });
    for (let i = 0; i < tech.length; i++)
      techU[i] =
        (lit !== null && worlds[lit]!.s.stack.includes(tech[i]!)) || techLit === tech[i] ? 1 : 0;

    // impacts age; the CPU's own marks: sparks, bursts, shockwaves; threads to a lit world's stack
    st.flash *= Math.pow(0.15, dt);
    for (let i = impacts.length - 1; i >= 0; i--) {
      impacts[i]!.age += dt;
      if (impacts[i]!.age > 1.5) impacts.splice(i, 1);
    }
    const R0 = CORE_RADIUS * (0.3 + 0.7 * grow) * (1 + st.flash * 0.18);
    dc = 0;
    lc = 0;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i]!;
      sp.k += dt / sp.dur;
      if (sp.k >= 1) {
        const d = norm(sp.from);
        impacts.push({ d, age: 0 });
        if (impacts.length > MAX_IMPACTS) impacts.shift();
        st.flash = Math.min(1, st.flash + 0.045);
        for (let j = 0; j < 5; j++)
          bursts.push({
            p: [d[0] * R0, d[1] * R0, d[2] * R0],
            v: [
              d[0] * 0.25 + gauss() * 0.22,
              d[1] * 0.25 + gauss() * 0.22,
              d[2] * 0.25 + gauss() * 0.22,
            ],
            age: 0,
          });
        sparks.splice(i, 1);
        continue;
      }
      const p1: Vec3 = [
        sp.from[0] * 0.5 + sp.lift[0],
        sp.from[1] * 0.5 + sp.lift[1],
        sp.from[2] * 0.5 + sp.lift[2],
      ];
      const flagship = worlds[sp.w]!.s.flagship;
      for (let j = 0; j < 9; j++) {
        const k = sp.k - j * 0.016;
        if (k < 0) break;
        D(
          bez(sp.from, p1, k * k * (3 - 2 * k)),
          j ? 0.022 * (1 - j / 11) : 0.036,
          j === 0 ? WHITE : j < 3 ? HOT : EMBER,
          (j ? 0.6 * (1 - j / 9) : 1) * (flagship ? 1 : 0.8)
        );
      }
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]!;
      b.age += dt;
      if (b.age > 0.55) {
        bursts.splice(i, 1);
        continue;
      }
      for (let k = 0; k < 3; k++) b.p[k] = b.p[k]! + b.v[k]! * dt;
      D(b.p, 0.014, HOT, 0.7 * (1 - b.age / 0.55));
    }
    for (let i = shocks.length - 1; i >= 0; i--) {
      const sh = shocks[i]!;
      sh.age += dt;
      if (sh.age > 1.1) {
        shocks.splice(i, 1);
        continue;
      }
      const w = worlds[sh.w]!,
        k = sh.age / 1.1,
        rr = w.rs * (1.6 + 7 * ease4(k));
      for (let j = 0; j < 120; j++) {
        const a = (j / 120) * Math.PI * 2,
          c = Math.cos(a),
          s = Math.sin(a);
        D(
          [
            w.pos[0] + (right[0] * c + up[0] * s) * rr,
            w.pos[1] + (right[1] * c + up[1] * s) * rr,
            w.pos[2] + (right[2] * c + up[2] * s) * rr,
          ],
          0.016,
          w.s.flagship ? HOT : BONE,
          0.8 * Math.pow(1 - k, 1.6)
        );
      }
    }
    tech.forEach((t, i) => {
      if (lit !== null && worlds[lit]!.s.stack.includes(t))
        Ln(worlds[lit]!.pos, techPos[i]!, PEACH, 0.32, 0.04);
      if (techLit === t)
        worlds.forEach((w) => {
          if (w.s.stack.includes(t)) Ln(w.pos, techPos[i]!, PEACH, 0.45, 0.06);
        });
    });
    impU.fill(0);
    impacts.forEach((im, i) => impU.set([im.d[0], im.d[1], im.d[2], im.age], i * 4));

    // draw
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.enable(gl!.BLEND);
    gl!.blendFuncSeparate(gl!.ONE, gl!.ONE, gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
    if (lc) {
      gl!.useProgram(LP);
      gl!.uniformMatrix4fv(U.lpv, false, PV);
      gl!.uniform2f(U.lshift, st.sx, st.sy);
      gl!.bindBuffer(gl!.ARRAY_BUFFER, lBuf);
      gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, lines, 0, lc * 14);
      gl!.bindVertexArray(lVao);
      gl!.drawArrays(gl!.LINES, 0, lc * 2);
    }
    gl!.useProgram(PP);
    gl!.uniformMatrix4fv(U.pv, false, PV);
    gl!.uniform2f(U.shift, st.sx, st.sy);
    gl!.uniform1f(U.scale, scalePx);
    gl!.uniform1f(U.focus, cam.dist);
    gl!.uniform1f(U.dof, st.dof);
    gl!.uniform1f(U.time, T);
    gl!.uniform1f(U.grow, grow);
    gl!.uniform1f(U.flash, st.flash);
    gl!.uniform1f(U.coreDim, focused !== null ? 0.7 : 1);
    gl!.uniform1f(U.q, q < 1 ? 1.4 : 1);
    gl!.uniform1f(U.sky, opts.sky);
    gl!.uniform4fv(U.ring, ringU);
    const rd = [0, 1, 2, 3].map((h) =>
      focused !== null && worlds[focused]!.s.home % 4 !== h ? 0.45 : 1
    );
    gl!.uniform4f(U.ringDim, rd[0]!, rd[1]!, rd[2]!, rd[3]!);
    gl!.uniform4fv(U.w, wU);
    gl!.uniform4fv(U.wb, wbU);
    gl!.uniform1fv(U.wspin, spinU);
    gl!.uniform4fv(U.imp, impU);
    gl!.uniform1i(U.impN, impacts.length);
    gl!.uniform4fv(U.tech, techU);
    gl!.uniform3f(U.right, right[0], right[1], right[2]);
    gl!.uniform3f(U.up, up[0], up[1], up[2]);
    gl!.uniform1i(U.beacon, beacon);
    gl!.bindVertexArray(sVao);
    gl!.drawArrays(gl!.POINTS, 0, staticCount);
    if (dc) {
      gl!.bindBuffer(gl!.ARRAY_BUFFER, dBuf);
      gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, dyn, 0, dc * F);
      gl!.bindVertexArray(dVao);
      gl!.drawArrays(gl!.POINTS, 0, dc);
    }

    const [cx, cy, cw] = project(PV, [0, 0, 0], st.w, st.h, [st.sx, st.sy]);
    frameOut.phase = st.phase;
    frameOut.week = st.phase === "replay" ? Math.min(nWeeks - 1, Math.floor(st.clock / weekS)) : -1;
    frameOut.sent = st.phase === "idle" ? total : Math.min(total, st.sent);
    frameOut.core.x = cx;
    frameOut.core.y = cy;
    frameOut.core.scale = (cam.base / cw) * (0.45 + 0.55 * grow);
    frameOut.core.flash = st.flash;
    frameOut.grown = grow > 0.95;
    opts.onFrame(frameOut);
  }

  // ---- the loop: 60 fps while something moves fast (the replay, a drag, a flight), 30 at rest
  let raf = 0,
    running = false,
    last = 0,
    acc = 0,
    busyUntil = 0,
    drawn = false;
  const tick = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    acc += dt;
    const fast = st.phase !== "idle" || now < busyUntil || sparks.length > 40;
    // Reduced motion: nothing moves on its own, so a frame is drawn only when the visitor does something.
    if (opts.reduced && now >= busyUntil && drawn) return;
    if (!fast && acc < 1 / 30) return;
    drawn = true;
    frame(acc);
    acc = 0;
  };
  const busy = () => {
    busyUntil = performance.now() + 2500;
  };

  return {
    resize(w, h, dpr, next) {
      st.w = Math.max(1, w);
      st.h = Math.max(1, h);
      st.dpr = dpr;
      layout = next;
      canvas.width = Math.round(st.w * dpr);
      canvas.height = Math.round(st.h * dpr);
      cam.base = distanceFor(next.ringPx, st.h);
      cam.tdist = focused !== null ? cam.base * 0.66 : cam.base;
      if (st.sx === 0 && st.sy === 0) {
        st.sx = 2 * next.cx - 1;
        st.sy = 1 - 2 * next.cy;
        cam.dist = cam.tdist;
      }
      if (!running) frame(0);
    },
    focus(i) {
      if (i === focused) return;
      focused = i;
      cam.tdist = i !== null ? cam.base * 0.66 : cam.base;
      if (i !== null) shocks.push({ w: i, age: 0 });
      busy();
    },
    hover(i) {
      hovered = i;
    },
    tech(name) {
      techLit = name;
      busy();
    },
    beacon(i) {
      beacon = i ?? -1;
    },
    replay(fromWeek = 0) {
      replay(fromWeek);
      busy();
    },
    pick(x, y, touch) {
      let best: number | null = null,
        bd = Infinity;
      frameOut.worlds.forEach((o, i) => {
        const d = Math.hypot(o.x - x, o.y - y);
        if (d < Math.max(touch ? 34 : 22, o.r + (touch ? 20 : 12)) && d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    },
    turn(dyaw, dpitch) {
      cam.vyaw = dyaw;
      cam.tyaw += dyaw;
      cam.tpitch = Math.max(-0.1, Math.min(1.0, cam.tpitch + dpitch));
      busy();
    },
    fling(vyaw) {
      cam.vyaw = vyaw;
      busy();
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      gl!.deleteBuffer(sBuf);
      gl!.deleteBuffer(dBuf);
      gl!.deleteBuffer(lBuf);
      gl!.deleteProgram(PP);
      gl!.deleteProgram(LP);
    },
  };
}
