// Skill evidence from a repo's own manifests (spec WP-103): the parsing.

import { describe, expect, it } from "vitest";
import { dependenciesFrom, fromPackageJson, fromPyproject, fromRequirements, normaliseDependency, skillsProvedBy, workspacePatterns } from "@/lib/jobs/manifests";

describe("manifest parsing", () => {
  it("reads every dependency group in package.json", () => {
    const pkg = JSON.stringify({ dependencies: { next: "16", "@prisma/client": "6" }, devDependencies: { vitest: "5", "@playwright/test": "1" }, scripts: { dev: "next" } });
    expect(fromPackageJson(pkg).sort()).toEqual(["@playwright/test", "@prisma/client", "next", "vitest"]);
    expect(fromPackageJson("not json")).toEqual([]);
  });

  it("reads requirements.txt names, ignoring versions, extras, markers, comments and options", () => {
    const req = ["fastapi==0.110.0", "pydantic>=2  # models", "uvicorn[standard]", "numpy; python_version>'3.8'", "-r dev.txt", "git+https://example.com/x.git", "", "# only a comment"].join("\n");
    expect(fromRequirements(req)).toEqual(["fastapi", "pydantic", "uvicorn", "numpy"]);
  });

  it("reads PEP 621 and Poetry dependencies from pyproject.toml", () => {
    const pep = `[project]\nname = "x"\ndependencies = [\n  "torch>=2",\n  "scikit-learn",\n]\n`;
    expect(fromPyproject(pep)).toEqual(["torch", "scikit-learn"]);
    const poetry = `[tool.poetry.dependencies]\npython = "^3.11"\nlangchain = "^0.2"\nchromadb = "*"\n\n[build-system]\nrequires = ["poetry-core"]\n`;
    expect(fromPyproject(poetry)).toEqual(["langchain", "chromadb"]);
  });

  it("normalises like PEP 503 and de-duplicates across manifests", () => {
    expect(normaliseDependency("Scikit_Learn")).toBe("scikit-learn");
    expect(dependenciesFrom({ "package.json": JSON.stringify({ dependencies: { React: "19" } }), "requirements.txt": "NumPy\nnumpy==2" })).toEqual(["numpy", "react"]);
  });

  it("refuses junk that isn't a package name", () => {
    expect(dependenciesFrom({ "package.json": JSON.stringify({ dependencies: { "<script>": "1", "a b": "1", ok: "1" } }) })).toEqual(["ok"]);
  });
});

describe("workspacePatterns", () => {
  it("reads a monorepo's workspace folders, either shape", () => {
    expect(workspacePatterns(JSON.stringify({ workspaces: ["apps/*", "packages/*", "./tools/cli/"] }))).toEqual(["apps/*", "packages/*", "tools/cli"]);
    expect(workspacePatterns(JSON.stringify({ workspaces: { packages: ["libs/*"] } }))).toEqual(["libs/*"]);
  });
  it("refuses escapes, deep globs and junk", () => {
    expect(workspacePatterns(JSON.stringify({ workspaces: ["../secrets", "/etc", "apps/**", "a b", 7] }))).toEqual([]);
    expect(workspacePatterns("not json")).toEqual([]);
  });
  it("workspace dependencies count like the root's", () => {
    expect(dependenciesFrom({ "package.json": JSON.stringify({ devDependencies: { turbo: "2" } }) }, [JSON.stringify({ dependencies: { next: "16" } })])).toEqual(["next", "turbo"]);
  });
});

describe("skillsProvedBy", () => {
  const skills = [
    { id: "playwright", aliases: ["@playwright/test", "playwright"] },
    { id: "sklearn", aliases: ["scikit-learn"] },
    { id: "docker", aliases: [] },
  ];
  it("a skill is proved when any alias is a dependency", () => {
    expect(skillsProvedBy(["@playwright/test", "next"], skills)).toEqual(["playwright"]);
    expect(skillsProvedBy(["scikit_learn"], skills)).toEqual(["sklearn"]);
  });
  it("a skill with no aliases is never proved by manifests", () => {
    expect(skillsProvedBy(["docker"], skills)).toEqual([]);
  });
});
