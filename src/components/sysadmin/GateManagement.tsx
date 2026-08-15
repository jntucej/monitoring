"use client";
import { DoorOpen, PlusCircle } from "lucide-react";

const DUMMY_GATES = [
    { id: 1, name: "Main Gate", operator: "Operator 1" },
    { id: 2, name: "East Gate", operator: "Operator 2" },
];

export function GateManagement() {
    return (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Gate Management</h3>
                <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700">
                    <PlusCircle className="w-5 h-5" />
                    Add Gate
                </button>
            </div>
            <div className="space-y-3">
                {DUMMY_GATES.map(gate => (
                    <div key={gate.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                            <DoorOpen className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="font-medium">{gate.name}</p>
                                <p className="text-xs text-gray-400">Assigned to: {gate.operator}</p>
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
