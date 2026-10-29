import Link from "next/link";
import { UserCheck, Clock, History, User, FileText, MapPin, ArrowRight } from "lucide-react";

const CARDS = [
  { href: "/visitor/registration",   icon: UserCheck, label: "Registration",     desc: "Update your visitor profile" },
  { href: "/visitor/request",        icon: FileText,  label: "Request Visit",    desc: "Ask a host to approve" },
  { href: "/visitor/approval-status", icon: Clock,    label: "Approval Status",  desc: "See if you are approved" },
  { href: "/visitor/checkin-out",    icon: MapPin,    label: "Check In / Out",   desc: "Record your entry and exit" },
  { href: "/visitor/host-info",      icon: User,      label: "Host Info",        desc: "Who you are visiting" },
  { href: "/visitor/history",        icon: History,   label: "History",          desc: "Past visits" },
];

export default function VisitorLandingPage() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Visitor Portal</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Manage your visit, host approval, and check-in/out.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARDS.map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center justify-between rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-elev-1)] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold truncate">{label}</div>
                <div className="text-xs text-[var(--text-muted)] truncate">{desc}</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--action-primary)] transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
