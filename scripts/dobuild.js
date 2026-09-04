const { spawn } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
const proc = spawn('npx', ['next', 'build'], { cwd: root, stdio: 'inherit', shell: true });
proc.on('exit', (code) => process.exit(code || 0));
proc.on('error', (e) => { console.error(e); process.exit(1); });
