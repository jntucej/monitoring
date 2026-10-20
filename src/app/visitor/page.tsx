import Link from "next/link";
import { UserCheck, Clock, History, User, FileText, MapPin } from "lucide-react";

export default function VisitorLandingPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Visitor Portal</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Manage your visit, host approval, and check-in/out.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { href: "/visitor/registration", icon: UserCheck, label: "Registration", desc: "Update your visitor profile" },
          { href: "/visitor/request",      icon: FileText,  label: "Request Visit",  desc: "Ask a host to approve" },
          { href: "/visitor/approval-status", icon: Clock, label: "Approval Status", desc: "See if you are approved" },
          { href: "/visitor/checkin-out",  icon: MapPin,    label: "Check In / Out", desc: "Record your entry and exit" },
          { href: "/visitor/host-info",    icon: User,      label: "Host Info",      desc: "Who you are visiting" },
          { href: "/visitor/history",      icon: History,   label: "History",        desc: "Past visits" },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href} className="block rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-elev-1)]">
            <Icon className="w-5 h-5 mb-2" />
            <div className="font-semibold">{label}</div>
            <div className="text-xs text-[var(--text-muted)]">{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
