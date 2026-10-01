// components/guide/rig.ts
// The AI guide's body (PUBLIC-REDESIGN-PLAN §3a): one image, deformed — never
// several redrawn images that could drift out of alignment. A small WebGL2
// renderer (no library) draws the master through a displacement field: the
// chest rises with each breath, the irises follow the cursor inside the eyes,
// the head leans a little after them as one rigid piece (no warping — a
// flat drawing can't turn), eyelids close for blinks and the mouth opens in
// time with the guide's words. Motion runs on springs (eyes quick, head slower with a slight
// overshoot) so it reacts like a person, not a sprite. Every feature point below is measured on the
// 1024×1536 master (design/character/master-anime-2d.png); if the master is
// replaced, re-measure them.
//
// The rig only renders while it's on screen and the tab is visible; with
// prefers-reduced-motion it draws a single still frame.

export type GuideMood = "idle" | "attentive" | "thinking" | "speaking";

export interface Rig {
  setMood(mood: GuideMood): void;
  /** Where the visitor is looking/pointing, relative to the character: -1…1 on each axis. */
  setLook(x: number, y: number): void;
  /** Queue text to be "spoken": the mouth follows its letters. */
  speak(text: string): void;
  setRunning(running: boolean): void;
  destroy(): void;
}

const RES = [1024, 1536] as const;
/**
 * The head moves as one rigid piece, and only a little: people follow a
 * cursor mostly with their eyes. A warp that "turns" a flat drawing reads as
 * stretching (owner, 2026-09-30); a real turn is the 3D model (ROADMAP-V2 #1).
 */
const HEAD_SHIFT = [3.5, 2.5] as const; // px at full look
const HEAD_TILT = 0.018; // radians at full look

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uBreath;
uniform vec2 uHead;
uniform float uTilt;
uniform vec2 uGaze;
uniform float uBlink;
uniform float uMouth;
uniform float uWide;

const vec2 HEAD = vec2(505.0, 250.0);
const vec2 HEAD_R = vec2(235.0, 265.0);
const vec2 PIVOT = vec2(505.0, 470.0);
const vec2 EYE_L = vec2(434.0, 254.0);
const vec2 EYE_R = vec2(562.0, 246.0);
const vec2 EYE_RAD = vec2(30.0, 13.0);
const vec2 MOUTH = vec2(505.0, 352.0);

float ellipse(vec2 p, vec2 c, vec2 r, float soft) {
  return 1.0 - smoothstep(1.0 - soft, 1.0, length((p - c) / r));
}

// How far the iris can travel inside the eye before it would leave the white.
const vec2 IRIS_ROOM = vec2(12.0, 4.0);

vec4 lid(vec4 col, vec2 s, vec2 c, float closed) {
  if (closed < 0.02) return col;
  vec2 e = (s - c) / EYE_RAD;
  if (length(e) > 1.15) return col;
  float edge = mix(-1.25, 1.2, closed);
  // Eyelid skin: sampled from the cheek just below the eye, so it matches the shading.
  vec4 skin = texture(uTex, (c + vec2(0.0, EYE_RAD.y * 2.7)) / uRes);
  if (e.y < edge) col = mix(col, skin, 0.96);
  float lash = 1.0 - smoothstep(0.0, 0.22, abs(e.y - edge));
  return mix(col, vec4(0.08, 0.055, 0.05, 1.0), lash * 0.9 * step(0.05, closed));
}

void main() {
  vec2 p = vUv * uRes;
  vec2 s = p;

  // Breathing: the chest and shoulders rise gently; nothing moves below the torso.
  float chest = smoothstep(430.0, 540.0, p.y) * (1.0 - smoothstep(700.0, 1250.0, p.y));
  s.y += uBreath * 2.0 * chest;

  // The head moves as one rigid piece (a small shift and tilt about the neck);
  // the neck blends over a long band so the joint never stretches.
  float hm = ellipse(p, HEAD, HEAD_R, 0.45) * (1.0 - smoothstep(395.0, 545.0, p.y));
  vec2 d = s - PIVOT;
  float a = -uTilt * hm;
  s = PIVOT + vec2(cos(a) * d.x - sin(a) * d.y, sin(a) * d.x + cos(a) * d.y) - uHead * hm;
  s.y += uBreath * 0.8 * hm;

  // The eyes (as the owner approved them): the iris region shifts inside each
  // eye, never further than the white allows; the outline and lashes stay put.
  vec2 gaze = clamp(uGaze, -IRIS_ROOM, IRIS_ROOM);
  float eyes = ellipse(s, EYE_L, EYE_RAD * vec2(0.8, 0.68), 0.35) + ellipse(s, EYE_R, EYE_RAD * vec2(0.8, 0.68), 0.35);
  vec4 col = texture(uTex, (s - gaze * eyes) / uRes);
  // Upper lids follow the gaze down a little; blinks on top.
  float follow = clamp(gaze.y / IRIS_ROOM.y, -1.0, 1.0) * 0.16;
  float closed = clamp(max(uBlink, follow), 0.0, 1.0);
  col = lid(col, s, EYE_L, closed);
  col = lid(col, s, EYE_R, closed);

  // Mouth shapes, drawn in the art's own dark lip tones.
  if (uMouth > 0.02) {
    vec2 m = (s - MOUTH) / vec2(34.0 + uWide * 10.0, 2.5 + uMouth * 15.0);
    float inside = 1.0 - smoothstep(0.82, 1.0, length(m));
    vec4 inner = vec4(0.2, 0.065, 0.06, 1.0);
    if (m.y < -0.4 && uMouth > 0.45) inner = mix(inner, vec4(0.92, 0.89, 0.85, 1.0), 0.75);
    col = mix(col, inner, inside * col.a);
  }
  outColor = col;
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const VOWELS = new Set("aeiouAEIOU");
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Build the rig on a canvas; null when WebGL2 isn't available (the page keeps the static image). */
export async function createRig(canvas: HTMLCanvasElement, imageUrl: string, reducedMotion: boolean): Promise<Rig | null> {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

  let image: HTMLImageElement;
  try {
    image = await loadImage(imageUrl);
  } catch {
    return null;
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const loc = {
    res: u("uRes"), breath: u("uBreath"), head: u("uHead"), tilt: u("uTilt"), 
    gaze: u("uGaze"), blink: u("uBlink"), mouth: u("uMouth"), wide: u("uWide"),
  };
  gl.uniform2f(loc.res, RES[0], RES[1]);

  // State: targets the controller sets, values eased toward them every frame.
  let mood: GuideMood = "idle";
  let lookX = 0, lookY = 0;
  // When the cursor rests, the guide looks back at the visitor after a moment.
  let lookedAt = -Infinity;
  const LOOK_BACK_AFTER = 3.5;
  const cur = { hx: 0, hy: 0, tilt: 0, gx: 0, gy: 0, mouth: 0, wide: 0 };
  // Springs: velocity per channel. stiffness/damping per group — eyes snap,
  // the head follows with a slight overshoot, the body lags.
  const vel: Record<string, number> = {};
  const spring = (key: keyof typeof cur, target: number, dt: number, stiffness: number, damping: number) => {
    const v = (vel[key] ?? 0) + ((target - cur[key]) * stiffness - (vel[key] ?? 0) * damping) * dt;
    vel[key] = v;
    cur[key] += v * dt;
  };
  let saccade = { x: 0, y: 0, at: 0 };
  let blink = 0, nextBlinkAt = 1.5, blinkStart = -1;
  let speech = "";
  let speechClock = 0;
  let running = false, raf = 0, last = 0, t = 0;

  function resize() {
    // 1.5x is indistinguishable from 2x at this size, for ~45% fewer pixels to shade.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (w && h && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
    }
    gl!.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw(breath: number) {
    resize();
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.uniform1f(loc.breath, breath);
    gl!.uniform2f(loc.head, cur.hx, cur.hy);
    gl!.uniform1f(loc.tilt, cur.tilt);
    gl!.uniform2f(loc.gaze, cur.gx, cur.gy);
    gl!.uniform1f(loc.blink, blink);
    gl!.uniform1f(loc.mouth, cur.mouth);
    gl!.uniform1f(loc.wide, cur.wide);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  function frame(now: number) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    t += dt;

    // Where the head and eyes want to be for this mood.
    let tx = 0, ty = 0, tTilt = 0, tgx = 0, tgy = 0;
    // Cursor resting for a while: ease the look back toward the visitor (the centre).
    const resting = t - lookedAt > LOOK_BACK_AFTER;
    const lx = resting ? lookX * Math.max(0, 1 - (t - lookedAt - LOOK_BACK_AFTER) / 1.2) : lookX;
    const ly = resting ? lookY * Math.max(0, 1 - (t - lookedAt - LOOK_BACK_AFTER) / 1.2) : lookY;
    if (mood === "attentive" || mood === "speaking") {
      // Soft saturation: quick to respond near the face, never snapping past its limits.
      const sx = Math.tanh(lx * 1.6), sy = Math.tanh(ly * 1.8);
      // The head leans after the eyes, a little, as one piece.
      tx = sx * HEAD_SHIFT[0]; ty = sy * HEAD_SHIFT[1]; tTilt = sx * HEAD_TILT;
      tgx = sx * 12 + saccade.x; tgy = sy * 4 + saccade.y;
      // Tiny eye flicks every second or two, the way eyes never quite rest.
      if (t > saccade.at) saccade = { x: (Math.random() - 0.5) * 1.6, y: (Math.random() - 0.5) * 1, at: t + 0.8 + Math.random() * 1.8 };
    } else if (mood === "thinking") {
      tx = -2; ty = -2; tTilt = 0.02; tgx = -6; tgy = -3.5;
    } else {
      // Idle: a slow, natural drift.
      tx = Math.sin(t * 0.45) * 1.5; ty = Math.sin(t * 0.31) * 0.8; tTilt = Math.sin(t * 0.27) * 0.008;
      tgx = Math.sin(t * 0.6) * 2; tgy = Math.sin(t * 0.43) * 1;
    }
    if (mood === "speaking") ty += Math.sin(t * 7) * 0.6; // small nods while talking

    // Mouth: follow the queued text at ~15 letters a second.
    let tMouth = 0, tWide = 0;
    if (speech.length > 0) {
      speechClock += dt * 15;
      while (speechClock >= 1 && speech.length > 0) {
        speech = speech.slice(1);
        speechClock -= 1;
      }
      const ch = speech[0] ?? " ";
      tMouth = /\s|[.,!?;:]/.test(ch) ? 0 : VOWELS.has(ch) ? 0.75 + ((ch.charCodeAt(0) % 3) * 0.1) : 0.3;
      tWide = ch === "e" || ch === "i" ? 0.8 : ch === "o" || ch === "u" ? 0 : 0.35;
    }

    const k = 1 - Math.exp(-dt * 8);
    // Eyes first, the head after with a slight overshoot.
    spring("gx", tgx, dt, 320, 30); spring("gy", tgy, dt, 320, 30);
    spring("hx", tx, dt, 55, 11); spring("hy", ty, dt, 55, 11); spring("tilt", tTilt, dt, 50, 11);
    cur.mouth = lerp(cur.mouth, tMouth, 1 - Math.exp(-dt * 22)); cur.wide = lerp(cur.wide, tWide, k);

    // Blinks every 2.8–6 s, sometimes twice — and often with a big glance, as in people.
    if (blinkStart < 0 && Math.abs(tgx - cur.gx) > 8 && t > nextBlinkAt - 2 && Math.random() < 0.08) nextBlinkAt = t;
    if (blinkStart < 0 && t >= nextBlinkAt) blinkStart = t;
    if (blinkStart >= 0) {
      const b = (t - blinkStart) / 0.17;
      blink = b < 0.4 ? b / 0.4 : b < 0.55 ? 1 : Math.max(0, 1 - (b - 0.55) / 0.45);
      if (b >= 1) {
        blinkStart = -1;
        blink = 0;
        nextBlinkAt = t + (Math.random() < 0.15 ? 0.25 : 2.8 + Math.random() * 3.2);
      }
    }

    draw(Math.sin((t / 4.4) * Math.PI * 2));
    if (running) raf = requestAnimationFrame(frame);
  }

  function setRunning(next: boolean) {
    if (reducedMotion) {
      draw(0);
      return;
    }
    if (next === running) return;
    running = next;
    if (running) {
      last = 0;
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
    }
  }

  draw(0);

  return {
    setMood(next) {
      mood = next;
    },
    setLook(x, y) {
      lookX = Math.max(-1, Math.min(1, x));
      lookY = Math.max(-1, Math.min(1, y));
      lookedAt = t;
    },
    speak(text) {
      speech += text;
    },
    setRunning,
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
