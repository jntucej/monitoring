"use client";
import { User, CheckCircle, XCircle } from "lucide-react";

export function ChildStatus() {
    const child = {
        name: "Akarsh Jadi",
        status: "inside", // 'inside' or 'outside'
        lastSeen: "Gate 1, Today at 10:30 AM"
    };

    return (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-full border-2 border-gray-400">
                    <img src="/avatar-placeholder.png" alt={child.name} className="rounded-full w-full h-full object-cover" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">{child.name}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{child.lastSeen}</p>
                </div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-white ${child.status === 'inside' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                {child.status === 'inside' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="font-semibold capitalize">{child.status === 'inside' ? 'Inside Campus' : 'Outside Campus'}</span>
            </div>
        </div>
    );
}
