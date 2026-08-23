import { LoginForm } from "@/components/shared/LoginForm";

export default function OperatorLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-6 lg:p-8">
      <LoginForm
        role="operator"
        title="Gate Operator Portal"
        subtitle="Manage entries and exits"
      />
    </div>
  );
}
