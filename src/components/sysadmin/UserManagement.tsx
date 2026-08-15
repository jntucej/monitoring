"use client";
import { UserPlus, User } from "lucide-react";

const DUMMY_USERS = [
    { id: 1, name: "Operator 1", role: "operator" },
    { id: 2, name: "Supervisor 1", role: "supervisor" },
    { id: 3, name: "Admin", role: "admin" },
];

export function UserManagement() {
    return (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">User Management</h3>
                <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700">
                    <UserPlus className="w-5 h-5" />
                    Add User
                </button>
            </div>
            <div className="space-y-3">
                {DUMMY_USERS.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                            <User className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                            </div>
                        </div>
                        <div className="space-x-2">
                            <button className="text-sm font-medium text-sky-400 hover:underline">Edit</button>
                            <button className="text-sm font-medium text-rose-400 hover:underline">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
