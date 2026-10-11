const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

let errors = [];

// A8 check: src/server/services/** must not import @/lib/postgres, @/lib/db, @/lib/occupancy, @/lib/predictive
const serviceFiles = getFiles(path.join(rootDir, 'src', 'server', 'services'));
const forbiddenInServices = ['@/lib/postgres', '@/lib/db', '@/lib/occupancy', '@/lib/predictive'];

for (const file of serviceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const forbidden of forbiddenInServices) {
    if (content.includes(`from "${forbidden}"`) || content.includes(`from '${forbidden}'`)) {
      errors.push(`[Layering Error] ${path.relative(rootDir, file)} imports forbidden module ${forbidden}`);
    }
  }
}

// A9 check: src/app/api/** must not import @/lib/occupancy or @/lib/predictive
const apiFiles = getFiles(path.join(rootDir, 'src', 'app', 'api'));
const forbiddenInApi = ['@/lib/occupancy', '@/lib/predictive'];

for (const file of apiFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const forbidden of forbiddenInApi) {
    if (content.includes(`from "${forbidden}"`) || content.includes(`from '${forbidden}'`)) {
      errors.push(`[Layering Error] ${path.relative(rootDir, file)} imports forbidden module ${forbidden}`);
    }
  }
}

if (errors.length > 0) {
  console.error("❌ Architectural Layering Verification Failed:");
  errors.forEach(e => console.error("  " + e));
  process.exit(1);
} else {
  console.log("✅ Architectural Layering Verification Passed!");
  process.exit(0);
}
