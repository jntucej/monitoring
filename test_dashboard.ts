import { dashboard } from './src/lib/db';

async function run() {
  const data = await dashboard();
  console.log('Total Scans:', data.totalScans);
  console.log('Students Total:', data.personTypeBreakdown.student.total);
}
run();