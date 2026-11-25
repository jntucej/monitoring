"use client";

import { useState } from "react";
import { SosButton } from "@/components/security/SosButton";
import { SosStatusCard } from "@/components/security/SosStatusCard";

export default function StudentSosPage() {
  const [activeSosId, setActiveSosId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <h1 className="text-xl font-bold text-foreground">Campus Emergency SOS</h1>
      {activeSosId ? (
        <SosStatusCard sosId={activeSosId} onDone={() => setActiveSosId(null)} />
      ) : (
        <SosButton onCreated={(id) => setActiveSosId(id)} />
      )}
    </div>
  );
}
