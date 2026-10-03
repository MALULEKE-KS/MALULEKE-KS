// lib/jobs/manifests.ts
// Dependency names from a repository's own manifests (spec WP-103, V1
// finalization 2026-10-02): the evidence that a skill is really used is the
// line in package.json or requirements.txt, read by the daily GitHub sync —
// never a typed-in stack list. Pure: no network, no database, so the parsing
// is tested on its own. Names are normalised (lower case; Python's "_" and "."
// as "-", per PEP 503) so they compare with a skill's aliases.

/** The manifests the sync reads, in the order it asks for them. */
export const MANIFEST_PATHS = ["package.json", "requirements.txt", "pyproject.toml"] as const;
export type ManifestPath = (typeof MANIFEST_PATHS)[number];

const MAX_NAMES = 400; // a sane cap per repo; a manifest is never this long
const MAX_LEN = 214; // npm's own limit for a package name

export function normaliseDependency(name: string): string {
  return name.trim().toLowerCase().replace(/[_.]+/g, "-");
}

const ok = (n: string) => n.length > 0 && n.length <= MAX_LEN && /^[@a-z0-9][a-z0-9@/._-]*$/i.test(n);

/** package.json → dependencies, devDependencies, peerDependencies, optionalDependencies. */
export function fromPackageJson(text: string): string[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  if (!json || typeof json !== "object") return [];
  const out: string[] = [];
  for (const key of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    const deps = (json as Record<string, unknown>)[key];
    if (deps && typeof deps === "object") out.push(...Object.keys(deps));
  }
  return out;
}

/** requirements.txt → the name before any version, extra, marker or comment. */
export function fromRequirements(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, "").trim())
    .filter((l) => l && !l.startsWith("-") && !l.includes("://"))
    .map((l) => /^([A-Za-z0-9][A-Za-z0-9._-]*)/.exec(l)?.[1] ?? "")
    .filter(Boolean);
}

/** pyproject.toml → [project].dependencies entries and [tool.poetry.dependencies] keys. */
export function fromPyproject(text: string): string[] {
  const out: string[] = [];
  // PEP 621: dependencies = ["fastapi>=0.110", "pydantic"] (possibly over several lines).
  const list = /^\s*dependencies\s*=\s*\[([\s\S]*?)\]/m.exec(text)?.[1];
  if (list) for (const m of list.matchAll(/["']([A-Za-z0-9][A-Za-z0-9._-]*)/g)) out.push(m[1]!);
  // Poetry: a table of name = "version" lines.
  const poetry = /^\[tool\.poetry\.(?:dev-)?dependencies\]\s*$([\s\S]*?)(?=^\[|$(?![\s\S]))/m.exec(text)?.[1];
  if (poetry) {
    for (const m of poetry.matchAll(/^\s*([A-Za-z0-9][A-Za-z0-9._-]*)\s*=/gm)) if (m[1]!.toLowerCase() !== "python") out.push(m[1]!);
  }
  return out;
}

/** At most this many workspace folders are read per repo. */
export const MAX_WORKSPACES = 16;

/**
 * Where a monorepo keeps its parts when its root doesn't declare workspaces —
 * a Makefile- or uv-run repo (FundsLink Academy: apps/web, apps/api,
 * packages/contracts, no root package.json). The convention, not a guess about
 * any one repo; a folder that isn't there simply contributes nothing.
 */
export const CONVENTIONAL_WORKSPACES = ["apps/*", "packages/*", "services/*"] as const;

/** A workspace folder's own manifests, the same files the root is read for. */
export type ManifestFiles = Partial<Record<ManifestPath, string>>;

/**
 * A monorepo's workspace folders from its root package.json ("workspaces":
 * ["apps/*", "packages/ui"] or { "packages": [...] }). Only plain paths and a
 * single trailing "/*" — never ".." or absolute paths.
 */
export function workspacePatterns(packageJson: string): string[] {
  let json: unknown;
  try {
    json = JSON.parse(packageJson);
  } catch {
    return [];
  }
  const ws = (json as { workspaces?: unknown })?.workspaces;
  const list = Array.isArray(ws) ? ws : Array.isArray((ws as { packages?: unknown })?.packages) ? (ws as { packages: unknown[] }).packages : [];
  return list
    .filter((p): p is string => typeof p === "string")
    .map((p) => p.trim().replace(/^\.\//, "").replace(/\/+$/, ""))
    .filter((p) => /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*(\/\*)?$/.test(p) && !p.split("/").includes(".."))
    .slice(0, MAX_WORKSPACES);
}

function namesIn(files: ManifestFiles): string[] {
  return [
    ...(files["package.json"] ? fromPackageJson(files["package.json"]) : []),
    ...(files["requirements.txt"] ? fromRequirements(files["requirements.txt"]) : []),
    ...(files["pyproject.toml"] ? fromPyproject(files["pyproject.toml"]) : []),
  ];
}

/** Every dependency named in the root's and the workspaces' manifests, normalised, unique, capped. */
export function dependenciesFrom(files: ManifestFiles, workspaces: ManifestFiles[] = []): string[] {
  const names = [...namesIn(files), ...workspaces.flatMap(namesIn)];
  return [...new Set(names.filter(ok).map(normaliseDependency))].sort().slice(0, MAX_NAMES);
}

/** Which skills a repo's dependencies prove: a skill matches when any of its aliases is a dependency. */
export function skillsProvedBy(dependencies: string[], skills: { id: string; aliases: string[] }[]): string[] {
  const deps = new Set(dependencies.map(normaliseDependency));
  return skills.filter((s) => s.aliases.some((a) => deps.has(normaliseDependency(a)))).map((s) => s.id);
}
