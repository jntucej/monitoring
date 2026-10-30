import { COLLEGE } from "@/lib/college-config";
import Link from "next/link";

export function HomeFooter() {
  return (
    <footer className="border-t border-[var(--border)] py-8 text-center text-sm text-zinc-400">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <p>
          © {new Date().getFullYear()} {COLLEGE.officialName ?? "Gate Monitor"}. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/help" className="hover:underline">Help</Link>
          <a href={`mailto:${COLLEGE.email ?? "support@college.edu"}`} className="hover:underline">Contact</a>
        </div>
      </div>
    </footer>
  );
}

export default HomeFooter;
