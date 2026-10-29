"use client";


import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { EnrollmentCodeModal } from "@/components/sysadmin/EnrollmentCodeModal";
import { UserRolesPanel } from "@/components/sysadmin/UserRolesPanel";
import {
  GraduationCap, Search, RefreshCw, UserPlus, Edit, Trash2,
  Ban, CheckCircle2, X, Upload, Phone, Mail, SlidersHorizontal, Lock, KeyRound,
  Link as LinkIcon, Loader2,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useUIStore } from "@/stores/uiStore";
import { BulkUserImportModal } from "@/components/sysadmin/BulkUserImportModal";
import { ROLL_DEPT_CODES, parseRollNumber, getStudentYearFromRoll, getDepartmentFromRoll, resolveCourseType } from "@/lib/rollNumber";

interface StudentRecord {
  id: string;
  uniqueId?: string;
  roll?: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  course?: string;
  year?: number | string;
  batch?: string;
  status: "ACTIVE" | "SUSPENDED" | string;
  hostelRoom?: string;
  isHosteller?: boolean;
  createdAt?: string;
  metadata?: Record<string, any>;
  studentDetails?: {
    roll?: string;
    departmentId?: string;
    course?: string;
    year?: number | string;
    section?: string;
    batch?: string;
    guardianName?: string;
    guardianPhone?: string;
    hostelRoom?: string;
    isHosteller?: boolean;
    branch?: string;
    semester?: string;
    regulation?: string;
    admissionDate?: string;
    admissionCategory?: string;
    eamcetHtNo?: string;
    eamcetEcetRank?: string;
    htNo?: string;
    studentName?: string;
    identificationMarks1?: string;
    identificationMarks2?: string;
    mobile?: string;
    email?: string;
    bloodGroup?: string;
    nationality?: string;
    religion?: string;
    caste?: string;
    subcaste?: string;
    phStatus?: string;
    dob?: string;
    fatherGuardianName?: string;
    motherName?: string;
    parentMobile?: string;
    parentEmail?: string;
    fatherOccupation?: string;
    incomePerAnnum?: string;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
  };
}

export default function SysAdminStudentsPage() {
const api = useApi();

  const { addToast } = useUIStore();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [enrollmentModalUser, setEnrollmentModalUser] = useState<{id: string, name: string} | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Link Parent modal state
  const [linkStudent, setLinkStudent] = useState<StudentRecord | null>(null);
  const [parents, setParents] = useState<Array<{ id: string; name: string; uniqueId?: string | null }>>([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  const loadParents = useCallback(async () => {
    try {
      const res = await fetch(`/api/parents?role=guardian&includeUnlinked=true`, {
        headers: api.getHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({ success: false, data: [] }));
      const list = Array.isArray(json.data) ? json.data : [];
      setParents(list.map((p: any) => ({ id: p.id, name: p.name, uniqueId: p.uniqueId ?? null })));
    } catch {
      setParents([]);
    }
  }, []);

  const openLinkParentModal = useCallback((s: StudentRecord) => {
    setLinkStudent(s);
    setSelectedParentId("");
    loadParents();
  }, [loadParents]);

  const handleLinkParent = async () => {
    if (!linkStudent || !selectedParentId) return;
    setLinkBusy(true);
    try {
      const res = await fetch("/api/parents/link", {
        method: "POST",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: linkStudent.id, parentUserId: selectedParentId }),
      });
      const json = await res.json().catch(() => ({ success: false }));
      if (res.ok && json.success) {
        addToast({ variant: "success", title: "Linked", message: `Guardian linked to ${linkStudent.name}.` });
        setLinkStudent(null);
        setSelectedParentId("");
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to link guardian." });
      }
    } catch {
      addToast({ variant: "error", title: "Network error", message: "Could not link guardian." });
    } finally {
      setLinkBusy(false);
    }
  };

  const [createForm, setCreateForm] = useState({
    roll: "", name: "", email: "", phone: "", branch: "", customMetaJson: "{}", customUniqueId: "",
  });

  const [editForm, setEditForm] = useState({
    name: "", email: "", phone: "", branch: "",
    customMetaJson: "{}",
    newPassword: "", newPin: "",
  });

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Load the roster once per refresh. The empty state is legitimate when
      // the DB has 0 students (a bulk import is pending), so no auto-retry —
      // the retry-on-empty path was compounding the 429s this page was
      // getting, and it was a leftover from the Supabase-cache era.
      const res = await fetch("/api/students", {
        headers: api.getHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({ success: false, error: { message: "Invalid server response." } }));
      if (res.ok && json.success && Array.isArray(json.data)) {
        setStudents(json.data);
      } else {
        const msg = json.error?.message || `Failed to load student roster (HTTP ${res.status})`;
        setLoadError(msg);
        addToast({ variant: "error", title: "Error", message: msg });
      }
    } catch {
      const msg = "Network error loading students";
      setLoadError(msg);
      addToast({ variant: "error", title: "Error", message: msg });
    } finally { setLoading(false); }
  }, [addToast]);

  // Load once on mount. The roster is not a live feed (students change only
  // on admin action), so no auto-polling — the 30-second interval used to
  // flood /api/students into its 429 budget. Manual refresh still works:
  // the page's Refresh button and every mutation (create/update/delete)
  // calls loadStudents directly.
  useEffect(() => { loadStudents(); }, [loadStudents]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      addToast({ variant: "error", title: "Validation", message: "Name is required." });
      return;
    }
    // Branch: auto-derive from roll when the user left it blank.
    const customUniqueId = createForm.customUniqueId.trim();
    const effRoll = customUniqueId || createForm.roll.trim();
    const branch = createForm.branch.trim() || getDepartmentFromRoll(effRoll) || "";
    if (branch && !createForm.branch.trim() && effRoll) {
      addToast({ variant: "info", title: "Branch Auto-Set", message: `Branch auto-detected as ${branch} from unique ID.` });
    }
    setBusy(true);
    try {
      let parsedMeta = {};
      try { parsedMeta = JSON.parse(createForm.customMetaJson || "{}"); } catch {
        addToast({ variant: "error", title: "Invalid JSON", message: "Custom metadata must be valid JSON." });
        setBusy(false); return;
      }
      const finalUniqueId = customUniqueId || createForm.roll.trim();
      const studentEmail = createForm.email.trim() || (finalUniqueId ? `${finalUniqueId.toLowerCase()}@jntuhcej.ac.in` : undefined);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          uniqueId: finalUniqueId || undefined, name: createForm.name, role: "student",
          email: studentEmail, phone: createForm.phone || undefined,
          department: branch || undefined,
          departmentId: branch || undefined,
          metadata: parsedMeta,
        }),
      });
      const json = await res.json().catch(() => ({ success: false, error: { message: "Invalid server response." } }));
      if (res.ok && json.success) {
        const assignedId = json.uniqueId ?? json.data?.uniqueId ?? json.data?.unique_id ?? null;
        addToast({ variant: "success", title: "Created", message: `Student ${createForm.name} added${assignedId ? ` with ID ${assignedId}` : ""}${assignedId && json.meta?.uniqueIdGenerated ? " (auto-generated)" : ""}.` });
        setShowCreateModal(false);
        setCreateForm({ roll: "", name: "", email: "", phone: "", branch: "", customMetaJson: "{}", customUniqueId: "" });
        loadStudents();
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to create student." });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network error creating student." });
    } finally { setBusy(false); }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setBusy(true);
    try {
      let parsedMeta = {};
      try { parsedMeta = JSON.parse(editForm.customMetaJson || "{}"); } catch {
        addToast({ variant: "error", title: "Invalid JSON", message: "Custom metadata must be valid JSON." });
        setBusy(false); return;
      }
      const targetEndpoint = (editingStudent.roll || editingStudent.uniqueId)
        ? `/api/students/${encodeURIComponent(editingStudent.roll || editingStudent.uniqueId || "")}`
        : `/api/users/${editingStudent.id}`;
      const res = await fetch(targetEndpoint, {
        method: "PATCH",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name || undefined, email: editForm.email || undefined,
          phone: editForm.phone || undefined, department: editForm.branch || undefined,
          password: editForm.newPassword || undefined,
          pin: editForm.newPin || undefined,
          metadata: parsedMeta,
        }),
      });
      const json = await res.json().catch(() => ({ success: false, error: { message: "Invalid server response." } }));
      if (res.ok && json.success !== false) {
        addToast({ variant: "success", title: "Updated", message: `Student updated.` });
        setEditingStudent(null);
        loadStudents();
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to update." });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network error updating student." });
    } finally { setBusy(false); }
  };

  const STATUS_OPTIONS = [
    { value: "ACTIVE",        label: "Active" },
    { value: "LOCKED",        label: "Locked" },
    { value: "SUSPENDED",     label: "Suspended" },
    { value: "DISABLED",      label: "Disabled" },
    { value: "DEPROVISIONED", label: "Deprovisioned" },
  ] as const;

  const handleResetPassword = async (s: StudentRecord) => {
    const raw = window.prompt(`Reset password for ${s.name} (${s.roll || s.uniqueId})?\nEnter new password (min 6 chars), leave blank to cancel:`, "");
    if (!raw || !raw.trim()) return;
    if (raw.trim().length < 6) {
      addToast({ variant: "error", title: "Too short", message: "Password must be at least 6 characters." });
      return;
    }
    try {
      const res = await fetch(`/api/users/${s.id}`, {
        method: "PATCH",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ password: raw.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        addToast({ variant: "success", title: "Password updated", message: `${s.name} can now log in with the new password. Kiosk PIN attempts have been cleared.` });
      } else {
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to reset password." });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network error resetting password." });
    }
  };

  const handleSetStatus = async (s: StudentRecord, newStatus: string) => {
    // Destructive transitions require a reason
    let reason = "";
    if (newStatus === "DEPROVISIONED" || newStatus === "DISABLED") {
      reason = window.prompt(`Reason for setting ${newStatus}?`) ?? "";
      if (reason.trim().length < 5) {
        addToast({ variant: "warning", message: "Reason required (min 5 chars)" });
        return;
      }
    }

    try {
      const targetEndpoint = (s.roll || s.uniqueId)
        ? `/api/students/${encodeURIComponent(s.roll || s.uniqueId || "")}`
        : `/api/users/${s.id}`;
      const res = await fetch(targetEndpoint, {
        method: "PATCH",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason }),
      });

      if (res.ok) {
        addToast({ variant: "success", title: "Status Updated", message: `${s.name} is now ${newStatus}.` });
        loadStudents();
      } else {
        const json = await res.json().catch(() => ({}));
        addToast({ variant: "error", title: "Error", message: json.error?.message ?? "Failed to update status." });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network error." });
    }
  };

  const handleDeleteStudent = async (s: StudentRecord) => {
    if (!confirm(`Delete student ${s.name} (${s.roll || s.uniqueId})? This cannot be undone.`)) return;
    try {
      const targetEndpoint = (s.roll || s.uniqueId)
        ? `/api/students/${encodeURIComponent(s.roll || s.uniqueId || "")}`
        : `/api/users/${s.id}`;
      const res = await fetch(targetEndpoint, { method: "DELETE", headers: api.getHeaders() });
      const data = await res.json();
      
      if (res.ok) {
        addToast({
          variant: "success",
          message: data.mode === "soft_delete"
            ? data.message ?? "Account deactivated (history preserved)"
            : "Student permanently deleted",
        });
        loadStudents();
      } else {
        addToast({ variant: "error", title: "Error", message: typeof data.error === "string" ? data.error : (data.error?.message ?? "Failed to delete.") });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network error." });
    }
  };

  const openEditModal = (s: StudentRecord) => {
    setEditingStudent(s);
    setEditForm({
      name: s.name, email: s.email || "", phone: s.phone || "",
      branch: s.department || "",
      customMetaJson: JSON.stringify(s.metadata || {}, null, 2),
      newPassword: "", newPin: "",
    });
  };

  // Canonical course label for a student, always "B.Tech" or "M.Tech".
  // The s.course column is now DB-derived (trg_sync_student_derived,
  // migration 20261227000002), so prefer it; fall back to the roll-derived
  // programme if the column is still polluted (e.g. a row missed by the
  // backfill, or a legacy import that landed before the trigger was added).
  // This keeps the UI correct even if the DB regresses.
  const courseOf = useCallback((s: StudentRecord): string => {
    const rawCourse = s.studentDetails?.course || s.course;
    if (rawCourse === "B.Tech" || rawCourse === "M.Tech") return rawCourse;
    const decoded = s.roll ? parseRollNumber(s.roll) : null;
    if (decoded) return resolveCourseType(rawCourse, decoded.entryModeCode).name;
    const rollUpper = (s.roll || s.uniqueId || "").toUpperCase();
    if (rollUpper.includes("1D")) return "M.Tech";
    if (rollUpper.includes("1A") || rollUpper.includes("5A")) return "B.Tech";
    return "Unassigned";
  }, []);

  // Canonical branch / department label.
  const branchOf = useCallback((s: StudentRecord): string => {
    let rawBranch = (s.studentDetails?.branch || "").trim();
    if (rawBranch === "ME") rawBranch = "MECH";
    if (rawBranch && !rawBranch.includes("(")) return rawBranch;
    const decoded = s.roll ? parseRollNumber(s.roll) : null;
    if (decoded && decoded.departmentCode && ROLL_DEPT_CODES[decoded.departmentCode]) {
      return ROLL_DEPT_CODES[decoded.departmentCode].short;
    }
    const dept = (s.department || "").trim();
    if (dept === "Mechanical Engineering" || dept === "ME") return "MECH";
    if (dept === "Computer Science & Engineering") return "CSE";
    if (dept === "Electronics & Communication Engineering") return "ECE";
    if (dept === "Electrical & Electronics Engineering") return "EEE";
    if (dept === "Information Technology") return "IT";
    return dept || "Unassigned";
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || s.name?.toLowerCase().includes(q) || s.roll?.toLowerCase().includes(q) ||
        s.uniqueId?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q);
      const matchesBranch = branchFilter === "ALL" || branchOf(s) === branchFilter;
      const matchesCourse = courseFilter === "ALL" || courseOf(s) === courseFilter;
      const matchesYear = yearFilter === "ALL" || String(s.year ?? "") === yearFilter;
      const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
      return matchesSearch && matchesBranch && matchesCourse && matchesYear && matchesStatus;
    });
  }, [students, search, branchFilter, courseFilter, yearFilter, statusFilter, branchOf, courseOf]);

  const branches = useMemo(() => {
    // Decode the branch / department from the roll (canonical B.Tech 5-branch
    // table + M.Tech specialization codes) so the filter options are the real
    // department names, not the polluted s.course values.
    const set = new Set<string>();
    students.forEach((s) => set.add(branchOf(s)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [branchOf]);

  const years = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.year != null && s.year !== "") set.add(String(s.year));
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [students]);

  // Infographic distributions (computed from the FULL roster, not the filtered view)
  const byBranch = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach((s) => {
      const k = branchOf(s);
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [branchOf]);

  const byYear = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach((s) => {
      const yr = s.year ?? s.studentDetails?.year;
      const k = yr == null || yr === "" ? "—" : String(yr);
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .filter(([k]) => k !== "—")
      .sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [students]);

  const byBatch = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach((s) => {
      const k = s.batch || "—";
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [students]);

  const courses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => { set.add(courseOf(s)); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [courseOf]);

  const byCourse = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach((s) => {
      const k = courseOf(s);
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [courseOf]);

  // --- Canonical branch card: always the 5 defined branches, decoded from roll
  const CANONICAL_BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH"] as const;
  const byBranchCanonical = useMemo(() => {
    const map: Record<string, number> = {};
    CANONICAL_BRANCHES.forEach((b) => { map[b] = 0; });
    let unassigned = 0;
    students.forEach((s) => {
      const b = branchOf(s);
      if (b && map[b] !== undefined) map[b] += 1;
      else unassigned += 1;
    });
    return { entries: CANONICAL_BRANCHES.map((b) => [b, map[b]] as [string, number]), unassigned };
  }, [students, branchOf]);

  // --- Batch → cohort spans with regular/lateral split + live year + graduation
  interface CohortRow {
    admissionYear: number;
    course: string;          // "B.Tech" | "M.Tech" | "Unassigned"
    regular: number;
    lateral: number;
    total: number;
    liveYearRegular: number; // current year-of-study for regulars in this cohort
    liveYearLateral: number; // current year-of-study for laterals in this cohort (usually 1 ahead)
    graduationYear: number;  // regular & lateral both graduate in the same calendar year
  }
  const cohorts = useMemo(() => {
    const now = new Date();
    const map: Record<string, { course: string; regular: number; lateral: number; liveYearRegular: number; liveYearLateral: number; admissionYear: number }> = {};
    students.forEach((s) => {
      const decoded = s.roll ? parseRollNumber(s.roll) : null;
      if (!decoded) return;
      const course = courseOf(s);
      const key = `${decoded.admissionYear}|${course}`;
      if (!map[key]) map[key] = { course, admissionYear: decoded.admissionYear, regular: 0, lateral: 0, liveYearRegular: 0, liveYearLateral: 0 };
      const rec = map[key];
      const yos = getStudentYearFromRoll(s.roll, now, course);
      if (decoded.entryModeCode === "5A") {
        rec.lateral += 1;
        if (yos && yos > rec.liveYearLateral) rec.liveYearLateral = yos;
      } else {
        rec.regular += 1;
        if (yos && yos > rec.liveYearRegular) rec.liveYearRegular = yos;
      }
    });
    const rows: CohortRow[] = Object.values(map).map((r) => {
      const duration = r.course === "M.Tech" ? 2 : 4;
      return {
        admissionYear: r.admissionYear,
        course: r.course,
        regular: r.regular,
        lateral: r.lateral,
        total: r.regular + r.lateral,
        liveYearRegular: r.liveYearRegular,
        liveYearLateral: r.liveYearLateral,
        graduationYear: r.admissionYear + duration,
      };
    });
    return rows.sort((a, b) => a.admissionYear - b.admissionYear || a.course.localeCompare(b.course));
  }, [students, courseOf]);

  const activeCount = useMemo(() => students.filter((s) => s.status === "ACTIVE").length, [students]);
  const totalStudents = students.length;
  const topBranch = byBranch[0];

  // ponytail: newest 4 by createdAt (capped so the panel doesn't flood)
  const recentStudents = useMemo(() => {
    return [...students]
      .filter((s) => s.createdAt)
      .sort((a, b) => (a.createdAt! < b.createdAt! ? 1 : -1))
      .slice(0, 4);
  }, [students]);


  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <GraduationCap className="w-7 h-7 text-emerald-400" />
              Student Management
            </p>
            <p className="text-sm text-slate-400 mt-1">Manage student roster. {students.length} records.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBulkModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-500">
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 shadow-lg shadow-emerald-900/30">
              <UserPlus className="w-4 h-4" /> Add Student
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Search by name, roll, email..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0d1220] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="bg-[#0d1220] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300">
              <option value="ALL">All Courses</option>
              {courses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="bg-[#0d1220] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300">
              <option value="ALL">All Branches</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="bg-[#0d1220] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300">
              <option value="ALL">All Years</option>
              {years.map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#0d1220] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300">
              <option value="ALL">All Status</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {/* Infographics — quick distributions over the full roster */}
        {!loading && totalStudents > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* KPI strip */}
            <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4 flex flex-col justify-between">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Students</div>
              <div className="mt-2 text-3xl font-bold text-white">{totalStudents.toLocaleString()}</div>
              <div className="mt-1 text-xs text-emerald-400">{activeCount.toLocaleString()} active ({totalStudents ? Math.round((activeCount / totalStudents) * 100) : 0}%)</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4 flex flex-col justify-between">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Largest Branch</div>
              <div className="mt-2 text-3xl font-bold text-emerald-400">{topBranch ? topBranch[0] : "—"}</div>
              <div className="mt-1 text-xs text-slate-400">{topBranch ? `${topBranch[1].toLocaleString()} students` : "No branch data"}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Course (B.Tech / M.Tech)</div>
              <div className="space-y-1.5">
                {byCourse.map(([c, n]) => (
                  <div key={c} className="flex items-center gap-2 text-xs">
                    <div className="w-14 text-slate-300 text-right">{c}</div>
                    <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className={`h-full rounded-full ${c === "M.Tech" ? "bg-purple-500" : "bg-sky-500"}`} style={{ width: `${totalStudents ? (n / totalStudents) * 100 : 0}%` }} />
                    </div>
                    <div className="w-10 text-slate-500 text-right">{n.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Branch distribution — canonical 5 branches decoded from roll */}
            <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4 sm:col-span-2">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Branch / Department Distribution</div>
              <div className="space-y-2">
                {byBranchCanonical.entries.map(([b, n]) => (
                  <div key={b} className="flex items-center gap-2 text-xs">
                    <div className="w-16 text-slate-300 truncate text-right">{b}</div>
                    <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalStudents ? (n / totalStudents) * 100 : 0}%` }} />
                    </div>
                    <div className="w-12 text-slate-500 text-right">{n.toLocaleString()}</div>
                  </div>
                ))}
                {byBranchCanonical.unassigned > 0 && (
                  <div className="text-[10px] text-slate-600">{byBranchCanonical.unassigned} unassigned / non-canonical</div>
                )}
              </div>
            </div>
            {/* Year distribution */}
            <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Year Distribution</div>
              <div className="flex items-end gap-2 h-20">
                {(() => {
                  const maxCount = byYear.reduce((m, [, n]) => Math.max(m, n), 0);
                  return byYear.map(([y, n]) => (
                    <div key={y} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] text-slate-400">{n}</div>
                      <div className="w-full rounded-t bg-sky-500" style={{ height: `${maxCount ? Math.max(8, (n / maxCount) * 56) : 0}px` }} />
                      <div className="text-[10px] text-slate-500">Yr {y}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
            {/* Batch → cohort spans with regular/lateral split + live year + graduation */}
            <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4 sm:col-span-2">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
                Batch Cohorts · Regular vs Lateral · Graduation Year
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 uppercase text-[10px] tracking-wider">
                      <th className="text-left pr-3 py-1">Batch</th>
                      <th className="text-left pr-3 py-1">Course</th>
                      <th className="text-right pr-3 py-1">Regular</th>
                      <th className="text-right pr-3 py-1">Lateral</th>
                      <th className="text-right pr-3 py-1">Total</th>
                      <th className="text-center pr-3 py-1">Reg Yr</th>
                      <th className="text-center pr-3 py-1">Lat Yr</th>
                      <th className="text-right py-1">Grad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.map((c, i) => (
                      <tr key={`${c.admissionYear}-${c.course}`} className={i % 2 ? "text-slate-400" : "text-slate-300"}>
                        <td className="pr-3 py-1 font-mono">{String(c.admissionYear).slice(2)}</td>
                        <td className="pr-3 py-1">
                          <span className={c.course === "M.Tech" ? "text-purple-400" : "text-sky-400"}>{c.course}</span>
                        </td>
                        <td className="pr-3 py-1 text-right">{c.regular}</td>
                        <td className="pr-3 py-1 text-right text-purple-300">{c.lateral}</td>
                        <td className="pr-3 py-1 text-right font-semibold text-white">{c.total}</td>
                        <td className="pr-3 py-1 text-center text-emerald-400">{c.liveYearRegular || "—"}</td>
                        <td className="pr-3 py-1 text-center text-purple-300">{c.liveYearLateral || "—"}</td>
                        <td className="py-1 text-right font-mono text-amber-300">{c.graduationYear}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-[10px] text-slate-600">
                B.Tech = 4 yrs · M.Tech = 2 yrs · Lateral (5A) joins 2nd year of the same batch → same graduation as regulars
              </div>
            </div>
          </div>
        )}


        {loadError && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-red-800/60 bg-red-950/40 text-sm text-red-300">
            <span><strong className="font-semibold">Failed to load roster:</strong> {loadError}</span>
            <button onClick={() => loadStudents()} className="px-3 py-1.5 rounded-lg bg-red-900/60 text-red-100 text-xs font-semibold hover:bg-red-800 whitespace-nowrap">Retry</button>
          </div>
        )}

        {/* Recently added — quick access to edit the newest students */}
        {recentStudents.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" /> Recently Added
            </h2>
            <div className="flex flex-wrap gap-2">
              {recentStudents.map((s) => (
                <div key={s.id} className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl bg-[#0d1220] border border-emerald-900/50">
                  <div className="text-xs">
                    <span className="font-semibold text-white">{s.name}</span>
                    <span className="ml-2 font-mono text-emerald-400">{s.roll || s.uniqueId}</span>
                  </div>
                  <button onClick={() => setEnrollmentModalUser({ id: s.id, name: s.name })} className="p-1.5 rounded-lg hover:bg-slate-700 text-emerald-400" title={`Enrollment ${s.name}`}><KeyRound className="w-3.5 h-3.5" /></button>
                  <button onClick={() => openEditModal(s)} className="p-1.5 rounded-lg hover:bg-slate-700 text-blue-400" title={`Edit ${s.name}`}>
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0d1220]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-slate-900/60 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Roll No</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Course</th>
                  <th className="px-4 py-3 text-left">Branch</th>
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No students found.
                      {students.length === 0 && !search && !loadError && (
                                        <div className="mt-2 text-xs text-slate-600 max-w-md mx-auto">
                      The database has 0 student rows. Add students via the bulk import (admin → Users → Import) — this page reflects live DB state, not a permissions or RLS issue.
                    </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-emerald-400">{s.roll || s.uniqueId || "—"}</td>
                      <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded-md font-medium ${courseOf(s) === "M.Tech" ? "bg-purple-500/15 text-purple-400 border border-purple-500/30" : "bg-sky-500/15 text-sky-400 border border-sky-500/30"}`}>
                          {courseOf(s)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs font-semibold">{branchOf(s)}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{s.year ? `Year ${s.year}` : "—"}</td>
                      <td className="px-4 py-3">
                        <select
                          value={s.status}
                          onChange={(e) => handleSetStatus(s, e.target.value)}
                          className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEnrollmentModalUser({ id: s.id, name: s.name })} className="p-1.5 rounded-lg hover:bg-slate-700 text-emerald-400" title="Enrollment Code"><KeyRound className="w-3.5 h-3.5" /></button>
                          <button onClick={() => openLinkParentModal(s)} className="p-1.5 rounded-lg hover:bg-slate-700 text-violet-400" title="Link Parent"><LinkIcon className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleResetPassword(s)} className="p-1.5 rounded-lg hover:bg-slate-700 text-amber-400" title="Reset Password"><Lock className="w-3.5 h-3.5" /></button>
                          <button onClick={() => openEditModal(s)} className="p-1.5 rounded-lg hover:bg-slate-700 text-blue-400" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteStudent(s)} className="p-1.5 rounded-lg hover:bg-slate-700 text-red-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>


        {/* Create Modal */}
        {enrollmentModalUser && (
        <EnrollmentCodeModal
          userId={enrollmentModalUser.id}
          userName={enrollmentModalUser.name}
          onClose={() => setEnrollmentModalUser(null)}
        />
      )}

      {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0d1220] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">Add New Student</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateStudent} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Roll Number <span className="text-slate-500 font-normal">(legacy — optional if Custom Unique ID set)</span></label>
                    <input type="text" value={createForm.roll} onChange={(e) => setCreateForm({ ...createForm, roll: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="22CS101" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Custom Unique ID <span className="text-slate-500 font-normal">(optional — auto ucej-s-NNNN if blank)</span></label>
                    <input type="text" value={createForm.customUniqueId} onChange={(e) => setCreateForm({ ...createForm, customUniqueId: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="e.g. ucej-s-0042 (overrides auto)" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name *</label>
                    <input type="text" required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Email</label>
                    <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Phone</label>
                    <input type="text" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Branch <span className="text-slate-500 font-normal">(optional — auto-detected from roll when blank)</span></label>
                  <input type="text" value={createForm.branch} onChange={(e) => setCreateForm({ ...createForm, branch: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="Auto from roll (e.g. CSE)" />
                  {createForm.roll && getDepartmentFromRoll(createForm.roll) && (
                    <div className="mt-1 text-[11px] text-emerald-400">Detected: {getDepartmentFromRoll(createForm.roll)}</div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Custom Metadata (JSON)</label>
                  <textarea rows={3} value={createForm.customMetaJson} onChange={(e) => setCreateForm({ ...createForm, customMetaJson: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700">Cancel</button>
                  <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50">{busy ? "Creating..." : "Create Student"}</button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Edit Modal */}
        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0d1220] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">Edit Student — {editingStudent.roll || editingStudent.uniqueId}</h2>
                <button onClick={() => setEditingStudent(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleEditStudent} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <UserRolesPanel userId={editingStudent.id} />
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Email</label>
                    <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Phone</label>
                    <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Branch</label>
                  <input type="text" value={editForm.branch} onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <div>
                    <label className="text-xs font-semibold text-amber-400 block mb-1">Reset Password (Optional)</label>
                    <input type="password" placeholder="New Auth Password" value={editForm.newPassword} onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-amber-400 block mb-1">Reset Kiosk PIN (Optional)</label>
                    <input type="text" placeholder="4-8 digit PIN" value={editForm.newPin} onChange={(e) => setEditForm({ ...editForm, newPin: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Custom Metadata (JSON)</label>
                  <textarea rows={4} value={editForm.customMetaJson} onChange={(e) => setEditForm({ ...editForm, customMetaJson: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700">Cancel</button>
                  <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50">{busy ? "Saving..." : "Update Student"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Link Parent Modal */}
        {linkStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0d1220] border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-violet-400" />
                  Link Guardian — {linkStudent.roll || linkStudent.uniqueId || linkStudent.name}
                </h2>
                <button onClick={() => setLinkStudent(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-400">
                  Link a guardian to <strong className="text-white">{linkStudent.name}</strong>.
                  No guardians yet? Create one from the <Link href="/sysadmin/parents" className="text-violet-400 hover:text-violet-300">Parents &amp; Guardians</Link> page.
                </p>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1" htmlFor="guardian">Guardian</label>
                  <select id="guardian"
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="">Select guardian…</option>
                    {parents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.uniqueId ? `(${p.uniqueId})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setLinkStudent(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700">Cancel</button>
                  <button
                    onClick={handleLinkParent}
                    disabled={linkBusy || !selectedParentId}
                    className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 disabled:opacity-50 flex items-center gap-2"
                  >
                    {linkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                    Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Import Modal */}
        {showBulkModal && (
          <BulkUserImportModal onClose={() => setShowBulkModal(false)} onSuccess={() => { setShowBulkModal(false); loadStudents(); }} />
        )}
      </div>
    </AuthGuard>
  );
}

