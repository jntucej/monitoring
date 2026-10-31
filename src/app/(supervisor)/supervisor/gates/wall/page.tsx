"use client";

import { GateWall } from "../../_retention/GateWall";
import { useApiResource } from "@/hooks/useApiResource";

export default function GateWallPage() {
  const { data } = useApiResource<{ data: { gates: any[] } }>("/api/supervisor/dashboard");
  const gates = data?.data?.gates ?? [];

  return <GateWall gates={gates} />;
}
