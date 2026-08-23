import { LoginForm } from "@/components/shared/LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-6 lg:p-8">
      <LoginForm
        role="admin"
        title="Admin Portal"
        subtitle="Manage system configurations and users"
      />
    </div>
  );
}
