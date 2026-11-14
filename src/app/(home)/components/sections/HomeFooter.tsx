import { COLLEGE } from "@/lib/college-config";
import { EmailLink, PhoneLink } from "@/components/shared/ContactLink";
import Link from "next/link";

export function HomeFooter() {
  return (
    <footer className="surface-card py-8 text-center text-sm text-zinc-400">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <p>
          © {new Date().getFullYear()} {COLLEGE.officialName ?? "Gate Monitor"}. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/help" className="hover:underline">Help</Link>
          <EmailLink email={COLLEGE.email ?? "support@college.edu"} showIcon={false} label="Contact support" />
          <PhoneLink phone={`+91${COLLEGE.phone}`} label={`+91 ${COLLEGE.phone}`} />
        </div>
      </div>
    </footer>
  );
}

export default HomeFooter;
