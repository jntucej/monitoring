"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { FacultyAttendanceView } from "../../_shared/FacultyAttendanceView";

export default function FacultyAttendancePage() {
  return (
    <div className="space-y-4 min-w-0">
      <ContextSituationBar
        roleLabel="Head of Department"
        purpose="Track departmental faculty check-ins, campus presence, and lecture attendance."
        contextLabel="Faculty Attendance"
        statusTone="info"
        statusSummary="Monitor real-time teacher arrival logs, leaves, and lecture attendance compliance."
        primaryAction={{ label: "Faculty Directory", href: "/hod/faculty/directory" }}
        secondaryActions={[
          { label: "Today Overview", href: "/hod/home" },
          { label: "Approvals Queue", href: "/hod" },
        ]}
      />
      <FacultyAttendanceView />
    </div>
  );
}
