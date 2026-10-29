import Link from "next/link";
import { LoginForm } from "@/components/shared/LoginForm";
import { Suspense } from "react";

export default function CinematicLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-[#05070b] text-slate-400">
          Loading...
        </div>
      }
    >
      <div className="min-h-[100dvh] w-full grid grid-cols-1 lg:grid-cols-12 bg-[#05070b] text-slate-100 overflow-x-hidden relative">
        <div className="absolute top-1/4 left-1/4 w-[32rem] h-[32rem] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 relative z-10 border-r border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400">
              GM
            </div>
            <span className="font-semibold tracking-wide text-slate-200">JNTUH UCEJ Gate Monitor</span>
          </div>
          <div className="max-w-md space-y-4 my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
              Secure Institutional Access
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Autonomous campus gate & entry control.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Real-time movement audits, role-based access control, and automated nightly backups secured on institutional encrypted storage.
            </p>
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>© JNTUH University College of Engineering Jagtial</span>
            <Link href="/bootstrap" prefetch={false} className="text-emerald-400 hover:underline">
              Account Setup
            </Link>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-5 flex flex-col items-center justify-center p-6 sm:p-12 relative z-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8 text-center">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 font-bold text-indigo-400 mb-2">
                GM
              </div>
              <h2 className="text-lg font-semibold text-white">JNTUH UCEJ Gate Monitor</h2>
              <p className="text-xs text-slate-400">Sign in to your dashboard</p>
            </div>

            <div className="backdrop-blur-2xl bg-slate-900/55 border border-slate-700/40 rounded-2xl shadow-2xl shadow-black/80 p-8 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-500/40 to-transparent" />
              <LoginForm
                title="Welcome Back"
                subtitle="Enter your credentials to access your console."
              />
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
