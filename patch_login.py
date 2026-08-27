import re

content = """'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { useRoles } from '@/hooks/useRoles';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { roles, loading } = useRoles();
  const iconMap: Record<string, any> = Icons;

  useEffect(() => {
    const forceRole = searchParams.get('force');
    const clearForce = searchParams.get('clear');

    if (clearForce) {
      localStorage.removeItem('forcedRole');
      router.replace('/login');
      return;
    }

    if (forceRole) {
      localStorage.setItem('forcedRole', `/login/${forceRole}`);
      router.replace(`/login/${forceRole}`);
      return;
    }

    // Check for existing forced role
    const storedForce = localStorage.getItem('forcedRole');
    if (storedForce) {
      router.replace(storedForce)      router.replace(store, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-base)] p-4 sm:p-8">
      <h1 className="text-3xl font-bold mb-10 te      <h1 className="text-3xl ft Portal      <h1 className="text-3xl font-id-cols-2 s      <h1 classap-6 w-full max-w-3xl">
        {loading ? (
          <div className="col-span-2 sm          <div className="col-sate-500 py          <div className="col-span-2.</div>
        ) : (
                                               st Icon = i                                                    return (
                                               ode}
                href={`/login/${role.code}`}
                       me="glass-c                       me="glass-c                       meder-in                       me="glass transition-a      ation-300 ease-out flex flex-col gap-3 shadow-sm hove                       me="glass-c                -white/5 h              go-500/30                       me="glass-c                       me="g2xl w-fit  ransition-colors duration-300 bg-indigo-500/10 text-indigo-400">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">{role.display_name} Portal</span>
                  <span className="block text-xs text-slate-500 mt-1">{role.description}</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
      <p className="mt-8 text-xs text-slate-500">
        To force a portal, use: <code>/logi        To force a portal, use: <code>/login?clear=t        To force a portal, use:v>
  );
}

export default function LoginLandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-muted)]">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}"""

with open("src/app/login/page.tsx", "w") as f:
    f.write(content)
