// scripts/generate-capability-docs.ts — writes the backend and frontend guides
// from lib/capabilities/map.ts (#82). Run: npm run docs:capabilities
// CI fails when the committed guides differ from what this would write.

import { writeFileSync } from "node:fs";
import { renderBackendGuide, renderFrontendGuide } from "@/lib/capabilities/render";

writeFileSync("docs/BACKEND-API-GUIDE.md", renderBackendGuide());
writeFileSync("docs/FRONTEND-DATA-GUIDE.md", renderFrontendGuide());
console.log("Wrote docs/BACKEND-API-GUIDE.md and docs/FRONTEND-DATA-GUIDE.md");
