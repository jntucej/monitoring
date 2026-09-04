const fs = require('fs');
const s = fs.readFileSync('src/app/globals.css', 'utf8');
let line = 1;
for (const row of s.split('\n')) {
  if (/action-(success|danger|warning|info)/.test(row)) console.log(line + ': ' + row.trim());
  line++;
}
// also find action-* usages in study pages to confirm what tokens are referenced
const study = 'src/app/study';
const files = ['src/app/study/ml/components/MlCheatCard.tsx','src/app/study/pdc/components/PdcCheatCard.tsx','src/app/study/pdc/components/PdcVisual.tsx'];
for (const f of files) {
  let t = fs.readFileSync(f,'utf8');
  const m = new Set();
  for (const mm of t.matchAll(/var\(--action-([a-z]+)\)/g)) m.add(mm[1]);
  console.log(f, '-> action tokens used:', [...m].join(','));
}