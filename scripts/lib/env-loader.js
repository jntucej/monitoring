/**
 * Minimal .env loader shared maintenance/test scripts.
 * Loads `<project-root>/.env.local` without depending dotenv
 * node --env-file support. Real environment variables win over file values.
 */

import fs from 'fs';
import path from 'path';

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      let val = m[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      } else if (val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
      }
      process.env[m[1]] = val;
    }
  }
}

function loadLocalEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env.local');
  parseEnvFile(envPath);
}

export { loadLocalEnv };