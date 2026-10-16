/* ───────────────────────────────────────────────────────────────────────
 * src/contracts/classes.ts
 * Backend contract for the classes + faculty system.
 * READ-ONLY for all agent groups. This file is the single source of
 * truth: types, route specs, RLS scopes, and input schemas.
 *
 * Conventions mirrored from the live codebase:
 *   - Response envelope: ok(data) → { success: true, data },
 *     fail(code, msg, status) → { success: false, error: { code, message } }
 *   - Auth context (AuthContext) fields: userId, role, departmentId, gateId
 *   - Postgres access via @/lib/postgres: query<T>(sql, params)
 * ─────────────────────────────────────────────────────────────────────── */

// ─── Core entity types ───────────────────────────────────────────────────

export interface ClassRow {
  id: string;
  departmentId: string;
  year: number;
  section: string;
  name: string | null;
  classTeacherId: string | null;
  roomNumber: string | null;
  capacity: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FacultyAssignment {
  id: string;
  facultyId: string;
  classId: string;
  subjectCode: string;
  role: "class_teacher" | "subject_faculty" | "assistant";
  assignedBy: string | null;
  assignedAt: string;
  isActive: boolean;
}

export interface Subject {
  code: string;
  label: string;
  departmentId: string | null;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MyClass extends ClassRow {
  /** Set only for role=subject_faculty: the subjects this faculty teaches in the class. */
  subjectCodes?: string[];
}

export interface ClassOverview {
  classRow: ClassRow;
  /** Roster: joined users + student_details, Person-shaped. */
  students: Array<{
    id: string;
    name: string;
    roll: string;
    year: number | null;
    section: string | null;
  }>;
  /** Today's attendance count for this class. */
  todayPresent: number;
  todayAbsent: number;
  totalStudents: number;
}

// ─── Input schemas (validated in handlers) ──────────────────────────────

export interface CreateClassInput {
  departmentId: string;
  year: number;
  section: string;
  name?: string;
  roomNumber?: string;
  capacity?: number;
}

export interface UpdateClassInput {
  classTeacherId?: string | null;
  name?: string;
  roomNumber?: string;
  capacity?: number;
  isActive?: boolean;
}

export interface AssignInput {
  facultyId: string;
  classId: string;
  subjectCode: string;
  role: "subject_faculty" | "assistant";
}

// ─── Route specs (path → method → scope → input → output) ───────────────

export interface RouteSpec {
  m: "GET" | "POST" | "PATCH" | "DELETE";
  p: string;
  s: string; // scope label
  r: string | null; // input ref
  o: string; // output type ref
  f: string; // source file
}

export const ROUTES: RouteSpec[] = [
  { m: "GET", p: "/api/classes", s: "hod|admin", r: null, o: "ClassRow[]", f: "src/app/api/classes/route.ts" },
  { m: "POST", p: "/api/classes", s: "hod|admin", r: "CreateClassInput", o: "ClassRow", f: "src/app/api/classes/route.ts" },
  { m: "GET", p: "/api/classes/[id]", s: "hod|teacher|assigned|admin", r: null, o: "ClassRow", f: "src/app/api/classes/[id]/route.ts" },
  { m: "PATCH", p: "/api/classes/[id]", s: "hod|admin", r: "UpdateClassInput", o: "ClassRow", f: "src/app/api/classes/[id]/route.ts" },
  { m: "GET", p: "/api/classes/[id]/students", s: "hod|teacher|assigned|admin", r: null, o: "Person[]", f: "src/app/api/classes/[id]/students/route.ts" },
  { m: "GET", p: "/api/faculty-assignments", s: "hod|self|admin", r: null, o: "FacultyAssignment[]", f: "src/app/api/faculty-assignments/route.ts" },
  { m: "POST", p: "/api/faculty-assignments", s: "hod|admin", r: "AssignInput", o: "FacultyAssignment", f: "src/app/api/faculty-assignments/route.ts" },
  { m: "DELETE", p: "/api/faculty-assignments/[id]", s: "hod|admin", r: null, o: "void", f: "src/app/api/faculty-assignments/[id]/route.ts" },
  { m: "GET", p: "/api/config/subjects", s: "auth", r: null, o: "Subject[]", f: "src/app/api/config/subjects/route.ts" },
  { m: "GET", p: "/api/faculty/my-classes", s: "faculty", r: "?role=", o: "MyClass[]", f: "src/app/api/faculty/my-classes/route.ts" },
  { m: "GET", p: "/api/faculty/my-class/[id]", s: "teacher|assigned", r: null, o: "ClassOverview", f: "src/app/api/faculty/my-class/[id]/route.ts" },
  { m: "GET", p: "/api/departments/[dept]/classes", s: "hod|admin", r: null, o: "ClassRow[]", f: "src/app/api/departments/[dept]/classes/route.ts" },
] as const;

// ─── RLS / scope predicates (each handler enforces its own) ─────────────

export const SCOPES = {
  hod: "caller.role='hod' AND caller.department_id = target.department_id",
  teacher: "classes.class_teacher_id = caller.id",
  assigned: "EXISTS faculty_assignments WHERE faculty_id=caller.id AND class_id=target.id AND is_active",
  self: "faculty_assignments.faculty_id = caller.id",
  admin: "caller.role IN ('admin','sysadmin')",
} as const;

// ─── Response envelope (mirrors src/server/http/response.ts) ────────────

export interface OkResponse<T> {
  success: true;
  data: T;
}

export interface FailResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
