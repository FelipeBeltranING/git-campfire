// A dependency-free lint: every JavaScript file must parse, use LF endings and
// end with a newline.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["src", "test", "scripts"];
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(m?js)$/.test(name)) files.push(p);
  }
};
roots.forEach(walk);

let problems = 0;
for (const file of files) {
  const src = readFileSync(file, "utf8");
  if (src.includes("\r")) {
    console.error(`${file}: CRLF line endings`);
    problems++;
  }
  if (!src.endsWith("\n")) {
    console.error(`${file}: no newline at the end`);
    problems++;
  }
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (err) {
    console.error(`${file}: ${String(err.stderr).trim()}`);
    problems++;
  }
}
console.log(`${files.length} files checked, ${problems} problem(s).`);
if (problems) process.exitCode = 1;
