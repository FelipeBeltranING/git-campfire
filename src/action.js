#!/usr/bin/env node
// The GitHub Action entry point (action.yml → runs.main).

import { runAction } from "./campfire.js";

runAction().catch((err) => {
  console.log(`::error::${err.message}`);
  process.exitCode = 1;
});
