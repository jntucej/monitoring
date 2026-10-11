const fs = require('fs');
const path = require('path');

const envPath = process.env.ENV_FILE || path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const dotenv = require('dotenv');
  const env = dotenv.parse(fs.readFileSync(envPath));
  console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('SUPABASE_SERVICE_ROLE_KEY length:', env.SUPABASE_SERVICE_ROLE_KEY?.length);
} else {
  console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
}
