import bcrypt from "bcryptjs";
const pin = process.argv[2];
if (!pin) { console.error("usage: node gen-hash.js <plain>"); process.exit(1); }
console.log(await bcrypt.hash(pin, 10));
