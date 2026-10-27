"use client";

import { useAuthStore } from "@/stores/authStore";
import { GraduationCap, User, Phone, Mail, MapPin, CalendarDays, IdCard } from "lucide-react";

/**
 * "Academic & Personal" detail section for the student profile.
 *
 * Fields are read from the joined `student_details` row (available on
 * `user.studentDetails` after /api/profile or /api/students/:roll). All 32
 * extended fields are nullable — anything still unset renders "—".
 */
export function AcademicPersonalSection() {
  const { user } = useAuthStore();
  const sd: Record<string, any> | null | undefined = (user as any)?.studentDetails;

  if (!sd) return null;

  const value = (k: string): string => {
    const raw = sd?.[k];
    if (raw === null || raw === undefined || raw === "") return "—";
    return String(raw);
  };

  const academic: Array<{ key: string; label: string }> = [
    { key: "department", label: "Department" },
    { key: "branch", label: "Branch" },
    { key: "semester", label: "Semester" },
    { key: "regulation", label: "Regulation" },
    { key: "admissionDate", label: "Admission Date" },
    { key: "admissionCategory", label: "Admission Category" },
    { key: "eamcetHtNo", label: "EAMCET HT No." },
    { key: "eamcetEcetRank", label: "EAMCET/ECET Rank" },
    { key: "htNo", label: "HT No." },
  ];

  const personal: Array<{ key: string; label: string }> = [
    { key: "studentName", label: "Student Name" },
    { key: "identificationMarks1", label: "Identification Mark 1" },
    { key: "identificationMarks2", label: "Identification Mark 2" },
    { key: "mobile", label: "Mobile" },
    { key: "email", label: "Email" },
    { key: "bloodGroup", label: "Blood Group" },
    { key: "nationality", label: "Nationality" },
    { key: "religion", label: "Religion" },
    { key: "caste", label: "Caste" },
    { key: "subcaste", label: "Sub-caste" },
    { key: "phStatus", label: "PH Status" },
    { key: "dob", label: "Date of Birth" },
  ];

  const family: Array<{ key: string; label: string }> = [
    { key: "fatherGuardianName", label: "Father / Guardian" },
    { key: "motherName", label: "Mother" },
    { key: "parentMobile", label: "Parent Mobile" },
    { key: "parentEmail", label: "Parent Email" },
    { key: "fatherOccupation", label: "Father Occupation" },
    { key: "incomePerAnnum", label: "Income / Annum" },
  ];

  const address: Array<{ key: string; label: string }> = [
    { key: "address", label: "Address" },
    { key: "city", label: "City" },
    { key: "district", label: "District" },
    { key: "state", label: "State" },
    { key: "pincode", label: "Pincode" },
  ];

  const group = (
    title: string,
    icon: React.ReactNode,
    rows: Array<{ key: string; label: string }>,
    id: string
  ) => {
    const filled = rows.filter((r) => value(r.key) !== "—");
    if (filled.length === 0) return null;
    return (
      <div key={id} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[var(--action-primary)]">{icon}</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{title}</h3>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {filled.map((r) => (
            <div key={r.key} className="flex items-baseline justify-between gap-3 py-1 border-b border-[var(--border)]/40 last:border-b-0">
              <dt className="text-[11px] sm:text-xs font-medium text-[var(--text-muted)]">{r.label}</dt>
              <dd className="text-[11px] sm:text-xs font-semibold text-[var(--text-primary)] text-right break-words">
                {value(r.key)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center gap-2">
        <IdCard className="w-4 h-4 text-[var(--action-primary)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Academic &amp; Personal Details</p>
      </div>
      {group("Academic", <GraduationCap className="w-4 h-4" />, academic, "academic")}
      {group("Personal", <User className="w-4 h-4" />, personal, "personal")}
      {group("Family & Guardian", <Phone className="w-4 h-4" />, family, "family")}
      {group("Address", <MapPin className="w-4 h-4" />, address, "address")}
    </div>
  );
}
