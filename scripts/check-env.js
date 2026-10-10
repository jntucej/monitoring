const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('/root/monitoring/.env'));
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!env.SUPABASE_SERVICE_ROLE_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY length:', env.SUPABASE_SERVICE_ROLE_KEY?.length);
