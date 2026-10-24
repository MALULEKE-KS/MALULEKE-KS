// scripts/generate-capability-docs.ts — writes the backend and frontend guides
// from lib/capabilities/map.ts (#82), and the home page's X-ray manifest from the
// same map and docs/ENFORCEMENT-REGISTER.md (D-067). Run: npm run docs:capabilities
// CI fails when the committed files differ from what this would write.

import { readFileSync, writeFileSync } from "node:fs";
import { renderBackendGuide, renderFrontendGuide } from "@/lib/capabilities/render";
import { buildXray } from "@/lib/xray/build";

writeFileSync("docs/BACKEND-API-GUIDE.md", renderBackendGuide());
writeFileSync("docs/FRONTEND-DATA-GUIDE.md", renderFrontendGuide());
const register = readFileSync("docs/ENFORCEMENT-REGISTER.md", "utf8");
writeFileSync("lib/xray/home.generated.json", `${JSON.stringify(buildXray("/", register), null, 2)}\n`);
console.log("Wrote docs/BACKEND-API-GUIDE.md, docs/FRONTEND-DATA-GUIDE.md and lib/xray/home.generated.json");
