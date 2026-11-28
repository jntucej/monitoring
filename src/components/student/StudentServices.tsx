"use client";

/**
 * StudentServices — the catalog-driven Services screen.
 *
 * 1. Static block/room wayfinding locator (facilities from catalog — no GPS).
 * 2. Direct Statutory Grievance launchers (form_schemas with bypass_staging=true).
 *
 * Zero hardcoded: the facility list and the statutory form list come from
 * /api/config/catalog at render time. No GPS, no live reader feeds.
 */
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Shield, Search } from "lucide-react";
import { useCatalog } from "@/hooks/useCatalog";
import { useStudentState } from "@/hooks/useStudentState";
import { SchemaFormDrawer } from "@/components/student/SchemaFormDrawer";

export function StudentServices() {
  const { catalog } = useCatalog();
  const { state: studentState } = useStudentState();
  const [query, setQuery] = useState("");
  const [openForm, setOpenForm] = useState<string | null>(null);

  const facilities = catalog?.facilities ?? [];
  const filtered = facilities.filter(
    (f) =>
      !query ||
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.code.toLowerCase().includes(query.toLowerCase())
  );

  // Statutory forms = form_schemas with bypass_staging=true.
  const statutoryForms = (catalog?.formSchemas ?? []).filter((f) => f.bypassStaging);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Campus Services</h1>
        <p className="text-sm text-text-secondary">
          Static block/room locator + direct statutory channels. No live GPS or security feeds.
        </p>
      </div>

      {/* ── Wayfinding locator ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-text-secondary" />
            Find a block or room
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-secondary" />
            <Input
              aria-label="Search facilities"
              placeholder="e.g. CSE lab, Hostel B2, mess hall…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {facilities.length === 0 ? "No facilities registered in the catalog yet." : "No matches."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filtered.map((f) => (
                <div key={f.code} className="rounded-lg border border-border bg-bg-elevated p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">{f.name}</span>
                    <Badge variant="entry" dot={false}>{f.category}</Badge>
                  </div>
                  {f.config && Object.keys(f.config).length > 0 && (
                    <p className="mt-1 text-xs text-text-secondary">
                      {Object.entries(f.config)
                        .filter(([k]) => !k.startsWith("_"))
                        .slice(0, 3)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Direct statutory grievance launchers ────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-text-secondary" />
            Direct Statutory Channels
          </CardTitle>
          <p className="text-xs text-text-secondary">
            These bypass class / CR staging and file straight to the statutory authority.
          </p>
        </CardHeader>
        <CardContent>
          {statutoryForms.length === 0 ? (
            <p className="text-sm text-text-secondary">No statutory forms registered yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {statutoryForms.map((f) => (
                <div key={f.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{f.name}</p>
                    {f.description && <p className="text-xs text-text-secondary">{f.description}</p>}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setOpenForm(f.key)}
                  >
                    Open
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Schema drawer (shared renderer) ────────────────────── */}
      {openForm && studentState && (
        <SchemaFormDrawer
          formKey={openForm}
          open={openForm !== null}
          onClose={() => setOpenForm(null)}
          state={studentState}
          onSubmitted={(key) => {
            setOpenForm(null);
            void key;
          }}
        />
      )}
    </div>
  );
}
