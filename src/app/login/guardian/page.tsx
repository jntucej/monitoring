import { LoginForm } from "@/components/shared/LoginForm";

export default function GuardianLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-6 lg:p-8">
      <LoginForm
        role="guardian" // unified guardian role (supersedes legacy 'parent')
        title="Guardian Portal"
        subtitle="Monitor your ward's attendance and movements"
      />
    </div>
  );
}
