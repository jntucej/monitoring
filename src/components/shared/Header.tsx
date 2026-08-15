"use client";
import { Menu, Bell } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-[var(--bg-surface)] border-b border-[var(--border)]">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 -ml-2 text-[var(--text-muted)] hover:bg-white/5 rounded-md">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-[var(--text-muted)] hover:bg-white/5 rounded-full">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
