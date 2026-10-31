"use client";

import { GateWall, type Gate } from "../../_retention/GateWall";
import { useApiResource } from "@/hooks/useApiResource";

export default function GateWallPage() {
  const { data } = useApiResource<{ data: { gates: Gate[] } }>("/api/supervisor/dashboard");
  const gates = data?.data?.gates ?? [];

  return <GateWall gates={gates} />;
}
