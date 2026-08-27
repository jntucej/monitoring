"use client";

import React from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ShieldCheck, FileText, Code2 } from "lucide-react";

export default function HelpDocsPage() {
  return (
    <AuthGuard>
      <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Help Center & Documentation</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            User guides, developer documentation, and system API references.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <BookOpen className="h-6 w-6 text-cyan-400" />
              <div>
                <CardTitle>User & Operator Guide</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                Learn how to scan passes, manage profiles, submit leave applications, and troubleshoot turnstile scanners.
              </p>
              <Button variant="secondary" size="sm" onClick={() => window.open("/docs/user-guide.md", "_blank")}>
                View User Guide
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-purple-400" />
              <div>
                <CardTitle>Admin & Governance Guide</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                Comprehensive reference for managing gate schedules, backup verification, compliance anonymization, and user roles.
              </p>
              <Button variant="secondary" size="sm" onClick={() => window.open("/docs/admin-guide.md", "_blank")}>
                View Admin Guide
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Code2 className="h-6 w-6 text-emerald-400" />
              <div>
                <CardTitle>Interactive OpenAPI / Swagger</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                Explore and test REST endpoints, payload definitions, and response codes.
              </p>
              <Button variant="primary" size="sm" onClick={() => window.open("/api/docs", "_blank")}>
                Open Swagger UI (/api/docs)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <FileText className="h-6 w-6 text-amber-400" />
              <div>
                <CardTitle>Architecture & Deployment</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                System architecture, database indexing, caching strategies, and production disaster recovery runbooks.
              </p>
              <Button variant="secondary" size="sm" onClick={() => window.open("/docs/architecture.md", "_blank")}>
                Architecture Overview
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
