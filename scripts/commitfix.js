const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = '/Users/akarsh/Desktop/CLG/GATE MONITOR/gate-monitor';
const run = (cmd) => { console.log('$ ' + cmd); return execSync(cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8' }); };

// Clean up temp scripts
for (const f of ['scripts/dobuild.js', 'scripts/checktokens.js']) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) { fs.rmSync(p); console.log('removed ' + f); }
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
