// tests/unit/orbit-shaders.test.ts
// The Orbit's shaders compile on real drivers, not only in CI's software renderer (D-071): none uses a word
// GLSL ES 3.00 reserves. (The planets once named a variable `active`: SwiftShader took it, every real GPU refused
// the shader, and visitors saw only the still.)

import { describe, expect, it } from "vitest";
import { SHADERS } from "@/components/home/orbit/engine";

// GLSL ES 3.00 §3.8 — keywords reserved for future use.
const RESERVED = [
  "attribute", "varying", "coherent", "volatile", "restrict", "readonly", "writeonly", "resource", "atomic_uint", "noperspective", "patch", "sample", "subroutine", "common", "partition", "active",
  "asm", "class", "union", "enum", "typedef", "template", "this", "goto", "inline", "noinline", "public", "static", "extern", "external", "interface", "long", "short", "double", "half", "fixed", "unsigned", "superp",
  "input", "output", "hvec2", "hvec3", "hvec4", "dvec2", "dvec3", "dvec4", "fvec2", "fvec3", "fvec4", "sampler3DRect", "filter", "sizeof", "cast", "namespace", "using",
];

describe("the Orbit's shaders", () => {
  for (const [name, src] of Object.entries(SHADERS)) {
    it(`${name} uses no reserved word`, () => {
      const code = src.replace(/\/\/[^\n]*/g, "");
      const used = RESERVED.filter((w) => new RegExp(`\b${w}\b`).test(code));
      expect(used).toEqual([]);
    });
  }
});
