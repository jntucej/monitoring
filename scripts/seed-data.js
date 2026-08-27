const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { loadLocalEnv } = require('./lib/env-loader');

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_SEED_PIN = process.env.SEED_DEFAULT_PIN;

if (!url || !key || !DEFAULT_SEED_PIN) {
  console.error("Required variables missing.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const NM = ['Amit', 'Raj', 'Vijay', 'Suresh', 'Ramesh', 'Dinesh', 'Mahesh', 'Arun', 'Kumar', 'Mani', 'Srinivas', 'Karthik', 'Nikhil', 'Rahul'];
const SUR = ['Kumar', 'Reddy', 'Rao', 'Naidu', 'Singh', 'Devi', 'Yadav', 'Pillai', 'Sharma', 'Verma', 'Patel', 'Gupta'];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() *const pick = (arr) => arr[Math.floor(Math.random() *const pick = (arr) => arr[Math.flt(const pick = (arr) => arr[Math.floor(Math.random() *coSeediconst pick = (arr) => arr[Math.flo dconst pick = (arr) => arr[Math.floor(Math.random()  10)const pst users =const pick = (arr) => arr[Math.floor(Math.randogetconst pick = (arr) => arr[Math.floor(Math.randomptoconst pick = (arr) => arr[Math.floor(Math.random().digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}    returnslice(17, 20)}-${hash.slice(20, 32)}`;
  }

  const STAFF_RANGES = [
    { start: 1, end: 200, type: 'faculty', designation: 'Regular Faculty', dept: '05' },
    { start: 201, end: 400, type: 'faculty', designation: 'APC Faculty', dept: '05' },
    { start:     { start:     { start:     { start:     { start:     { start:     { start:     { start:     { start:     { start:   ',    { start:     { start:     { start:     { start:     { start:     { start: <=     { start:     { start:     { start:     { start:     { start:     { start:     { start:     { start:     { start:     { start:   ',    { start:     { start:     { start:     { start:     { start:     { start: <=     { start:     { start:     { start:     { start:     { start:     { start:     { start:     { start:     { start:     { start:   ',    { start:     { start:     { start:     { start:     { start:     { start: <=     { start:     { start:     { start:   
      photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}`,
      qr_code: JSON.stringify({ un      qr_code: JSON.strra      qr_code: JSON.stringify({ un      qr_code: JSON.strra      qr_code: JSON.strin    user_id: userId, employee_id: staffId, designation: range.designation,
      joining_date: '2021-01-10', is_hod: (i === 1), department_id: range.dept
    });
  }
  
  console.log('✅ Staff UCEJ data ready to upsert.');
}

main().catch(console.error);
