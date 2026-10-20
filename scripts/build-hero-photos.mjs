// scripts/build-hero-photos.mjs
// Builds the home hero's two cover images from two source files (docs/improvements/
// HOME-HERO-PLAN.md §7): a landscape one for desktops and a portrait one for
// phones. Each is encoded the way an admin upload is (lib/profile/photos.ts:
// oriented, resized to fit the edge, WebP, no metadata) and written as
// design/hero/*.webp plus an additive data migration that adds them as the
// current "hero-desktop" and "hero-mobile" photos and fills the credit in the
// "home-hero" content block. The originals are never committed. Replace either
// later in Admin → Photos — the migration only runs once.
//
// Page hero images (Systems, Journey, About, Let's talk — docs/improvements/HOME-HERO-PLAN.md §20): one landscape
// image per page, in its own slot: --slot hero-systems=<landscape.png> (repeatable; --page-edge / --page-quality
// default to the settings site.pageHero.*).
//
// With --replace the migration supersedes the slot's current photo (BR-1.17: a version is
// superseded, never altered or deleted) and adds the new image as the current one; give just
// the source(s) you are replacing (--desktop and/or --mobile), and --note for the migration's header.
//
//   node scripts/build-hero-photos.mjs --desktop <landscape.png> --mobile <portrait.png> \
//     --migration 20261020160000_home_hero_cover_images --credit "Image: …" --alt "…"
//
// The quality and edge defaults match the settings home.hero.desktop.* /
// home.hero.mobile.*; --credit-url is optional.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const desktopSrc = flag("desktop", null);
const mobileSrc = flag("mobile", null);
const replace = args.includes("--replace");
// --slot <purpose>=<file>, repeatable: a page's own hero image.
const slotArgs = args.flatMap((a, i) => (a === "--slot" && args[i + 1] ? [args[i + 1]] : []));
const slots = slotArgs.map((s) => {
  const eq = s.indexOf("=");
  if (eq < 1) throw new Error(`--slot wants <purpose>=<file>, got "${s}"`);
  return [s.slice(0, eq), s.slice(eq + 1)];
});
if ((!desktopSrc || !mobileSrc) && !replace && slots.length === 0) {
  console.error("usage: node scripts/build-hero-photos.mjs --desktop <landscape> --mobile <portrait> [--migration <folder>] [--credit …] [--credit-url …] [--alt …] [--replace [--note …]]");
  process.exit(1);
}
if (!desktopSrc && !mobileSrc && slots.length === 0) {
  console.error("give at least one of --desktop, --mobile and --slot");
  process.exit(1);
}

const migration = flag("migration", null);
const credit = flag("credit", null);
const creditUrl = flag("credit-url", null);
const alt = flag("alt", "The home hero's cover image");
const desktop = { edge: Number(flag("desktop-edge", "2560")), quality: Number(flag("desktop-quality", "74")) };
const mobile = { edge: Number(flag("mobile-edge", "1536")), quality: Number(flag("mobile-quality", "72")) };
const page = { edge: Number(flag("page-edge", "1920")), quality: Number(flag("page-quality", "78")) };

// --denoise <n>: a median filter of that size before encoding. Generated photographs carry film grain, which
// WebP spends most of its bytes on; a size-3 median keeps the edges and drops the grain, so a sharper image fits the budget.
const denoise = Number(flag("denoise", "0"));

const encode = async (file, { edge, quality }) => {
  // The steps of processPhoto() in lib/profile/photos.ts (plus the optional denoise); throws if the file is not an image we can read.
  let image = sharp(resolve(file)).rotate();
  if (denoise > 0) image = image.median(denoise);
  const { data, info } = await image
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, sha256: createHash("sha256").update(data).digest("hex") };
};

const built = {};
if (desktopSrc) built["hero-desktop"] = await encode(desktopSrc, desktop);
if (mobileSrc) built["hero-mobile"] = await encode(mobileSrc, mobile);
for (const [purpose, file] of slots) {
  built[purpose] = await encode(file, page);
  if (built[purpose].width <= built[purpose].height) throw new Error(`The ${purpose} image should be landscape.`);
}
if (built["hero-desktop"] && built["hero-desktop"].width <= built["hero-desktop"].height) throw new Error("The desktop image should be landscape.");
if (built["hero-mobile"] && built["hero-mobile"].width >= built["hero-mobile"].height) throw new Error("The phone image should be portrait.");

const outDir = resolve("design/hero");
mkdirSync(outDir, { recursive: true });
for (const [purpose, p] of Object.entries(built)) {
  writeFileSync(resolve(outDir, `${purpose}.webp`), p.data);
  console.log(`${purpose}: ${p.width}x${p.height}, ${(p.data.length / 1024).toFixed(1)} KiB, sha256 ${p.sha256.slice(0, 12)}`);
}

if (migration) {
  const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
  const note = flag("note", null);
  // --replace: supersede the slot's current version first (allowed: only the alt text and whether it is current may change), then add the new one.
  const supersede = ([purpose, p]) => `UPDATE "ProfilePhoto" SET "supersededAt" = now() WHERE "purpose" = ${q(purpose)} AND "supersededAt" IS NULL AND "sha256" <> ${q(p.sha256)};\n\n`;
  const insert = ([purpose, p]) => (replace ? supersede([purpose, p]) : "") + `INSERT INTO "ProfilePhoto" ("id", "purpose", "altText", "mimeType", "width", "height", "byteSize", "sha256", "fileData")
SELECT gen_random_uuid()::text, ${q(purpose)}, ${q(alt)}, 'image/webp', ${p.width}, ${p.height}, ${p.data.length}, ${q(p.sha256)}, decode('${p.data.toString("base64")}', 'base64')
WHERE NOT EXISTS (SELECT 1 FROM "ProfilePhoto" WHERE "purpose" = ${q(purpose)} AND "supersededAt" IS NULL);`;
  const creditFields = [credit ? `'imageCredit', ${q(credit)}` : null, credit && creditUrl ? `'imageCreditUrl', ${q(creditUrl)}` : null].filter(Boolean);
  const creditSql = creditFields.length
    ? `\nUPDATE "SiteContent"
SET "body" = "body" || jsonb_build_object(${creditFields.join(", ")})
WHERE "key" = 'home-hero' AND NOT ("body" ? 'imageCredit');\n`
    : "";
  const header = replace && note
    ? `-- ${note}\n-- Generated by scripts/build-hero-photos.mjs --replace; the encoded image(s) are in design/hero/. The slot's current\n-- photo is superseded (BR-1.17: kept, never altered or deleted) and the new one becomes current — the owner can replace\n-- it in Admin → Photos at any time. Additive only.\n`
    : `-- Sprint 1 (docs/improvements/HOME-HERO-PLAN.md §7, D-030, D-034): the home hero's cover images, as data.
-- Generated by scripts/build-hero-photos.mjs from two source files (not committed); the encoded images are
-- design/hero/hero-desktop.webp (landscape) and hero-mobile.webp (portrait). Each is added as the current photo
-- of its slot only if the slot is empty — the owner replaces either in Admin → Photos at any time (the old one
-- is kept, BR-1.17). The credit is the "home-hero" block's, shown on the image. The hero itself stays off until
-- the flag home.hero_v2 is switched on. Additive only.`;
  const sql = `${header}

${Object.entries(built).map(insert).join("\n\n")}
${creditSql}`;
  const file = resolve("prisma/migrations", migration, "migration.sql");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, sql);
  console.log(`migration written: ${file} (${(sql.length / 1024).toFixed(0)} KB)`);
}
