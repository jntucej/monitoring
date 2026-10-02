import fs from 'fs';

const css = fs.readFileSync('src/app/globals.css', 'utf8');
let line = 1;
for (const row of css.split('\n')) {
  if (/action-(success|danger|warning|info)/.test(row)) {
    console.log(line + ':' + row.trim());
  }
  line++;
}

// Find action-* usages on study pages confirm what tokens referenced
const study = 'src/app/study';
const files = [
  'src/app/study/ml/components/MlCheatCard.tsx',
  'src/app/study/pdc/components/PdcCheatCard.tsx',
  'src/app/study/pdc/components/PdcVisual.tsx',
];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const m = new Set();
  for (const mm of content.matchAll(/var\(--action-([a-z]+)\)/g)) {
    m.add(mm[1]);
  }
  console.log('-> action tokens used:', [...m].join(','), f);
}