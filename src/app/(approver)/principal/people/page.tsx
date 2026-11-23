"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PeopleRegisterView } from "../_shared/PeopleRegisterView";

function PeopleRegister() {
  const searchParams = useSearchParams();
  const personParam = searchParams.get("person");
  return <PeopleRegisterView personParam={personParam} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PeopleRegister />
    </Suspense>
  );
}
