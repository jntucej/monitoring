/**
 * Minimal .env loader shared by maintenance/test scripts.
 *
 * Loads `<project-root>/.env.local` without depending on dotenv or
 * node --env-file support. Real environment variables always win over
 * file values.
 */
const fs = require("fs");
const path = require("path");

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[m[1]] = val;
    }
  }
}

function loadLocalEnv() {
  parseEnvFile(path.join(__dirname, "..", "..", ".env.local"));
}

module.exports = { loadLocalEnv };
