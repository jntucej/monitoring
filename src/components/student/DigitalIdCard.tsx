"use client";
import { User, QrCode } from "lucide-react";
import { QRCode } from "react-qrcode-logo";

export function DigitalIdCard() {
  const student = {
    name: "Akarsh Jadi",
    roll: "2101CS02",
    branch: "Computer Science",
    year: "3rd Year",
    photo: "/avatar-placeholder.png"
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-8 flex flex-col items-center">
        <div className="relative w-32 h-32 rounded-full mb-4 border-4 border-sky-500">
            <img src={student.photo} alt={student.name} className="rounded-full w-full h-full object-cover" />
        </div>
        <h2 className="text-2xl font-bold">{student.name}</h2>
        <p className="text-[var(--text-secondary)]">{student.roll}</p>
        <p className="text-sm text-[var(--text-muted)]">{student.branch} - {student.year}</p>
        <div className="mt-6 p-4 bg-white rounded-lg">
            <QRCode value={student.roll} size={160} />
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">Scan for verification</p>
    </div>
  );
}
