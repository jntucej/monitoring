import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const root = path.resolve(__dirname, '..');
const run = (cmd) => {
  console.log(cmd);
  return spawn(cmd, { cwd: root, stdio: 'pipe', shell: true });
};

// Clean temp scripts
for (const f of ['scripts/dobuild.js', 'scripts/checktokens.js']) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) {
    fs.rmSync(p);
    console.log('removed', f);
  }
}

// Stage
console.log(run('git add -A'));
// Status
console.log(run('git status --short'));
// Commit
console.log(run('git commit -m "fix: make study-resource text colors fully theme-adaptive"'));
// Push
console.log(run('git push'));
console.log('DONE');