"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { PeopleRegisterView } from "../_shared/PeopleRegisterView";

function PeopleRegister() {
  const searchParams = useSearchParams();
  const personParam = searchParams.get("person");
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Comprehensive directory of students, faculty, and administrative staff across the institution"
        why="The institutional people register provides immediate access to student profiles, faculty credentials, and transit history records."
        contextLabel="Institutional People Register"
        statusSummary="Search and inspect individual records, academic departments, hostel allocations, and transit histories."
        primaryAction={{ label: "Assignment Tree", href: "/principal/people/assignment-tree" }}
        secondaryAction={{ label: "Departments Roster", href: "/principal/people/departments" }}
      />
      <PeopleRegisterView personParam={personParam} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PeopleRegister />
    </Suspense>
  );
}
