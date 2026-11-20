// Regenerate test/snapshots/ after an intended change to the art:
//   npm run snapshots
import { mkdirSync, writeFileSync } from "node:fs";

import { renderCampfire } from "../src/render.js";
import { allCases } from "./cases.mjs";

const dir = new URL("../test/snapshots/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const c of allCases()) {
  writeFileSync(new URL(`${c.name}.svg`, dir), renderCampfire(c));
  console.log(`test/snapshots/${c.name}.svg`);
}
