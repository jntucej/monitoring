/**
 * Replicate the exact /api/students list path: findAllStudents() + route sanitization.
 * Run: npx tsx tests/diag-students-api.ts
 */
const { loadLocalEnv } = require("../scripts/lib/env-loader");
loadLocalEnv();

(async () => {
  const db = require("../src/lib/db");
  console.log("SUPABASE_SERVICE_ROLE_KEY set:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  const data = await db.findAllStudents();
  console.log("findAllStudents() returned:", data.length, "rows");
  if (data.length) {
    const s = data[0];
    console.log("first row keys:", Object.keys(s).join(", "));
    // Exact sanitization from src/app/api/students/route.ts
    const mapped = data.map((x: any) => ({
      id: x.id,
      uniqueId: x.uniqueId || x.roll || "",
      roll: x.roll || x.uniqueId || "",
      name: x.fullName || x.name || x.roll || x.uniqueId || "Student",
      email: x.email || "",
      phone: x.phone || "",
      department: x.department || x.departmentId || "",
      year: x.studentDetails?.year || x.year || "",
      section: x.studentDetails?.section || x.section || "",
      batch: x.studentDetails?.batch || x.batch || "",
      photo: x.photoUrl || x.photo || "",
      status: (x.status || "ACTIVE").toUpperCase(),
      hostelRoom: x.studentDetails?.roomNumber || x.hostelRoom || "",
      isHosteller: !!(x.studentDetails?.roomNumber || x.isHosteller),
      createdAt: x.createdAt || "",
      studentDetails: x.studentDetails,
      flagStatus: x.flagStatus ?? null,
    }));
    console.log("sanitized rows:", mapped.length);
    console.log("sample:", JSON.stringify(mapped.slice(0, 2), null, 2));
  }
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
