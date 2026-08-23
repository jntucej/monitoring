'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, 
  User, 
  Users, 
  BookOpen, 
  GraduationCap, 
  RadioTower 
} from 'lucide-react';

export default function LoginLandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const roles = [
    { name: 'Admin', path: '/login/admin', icon: Shield },
    { name: 'Operator', path: '/login/operator', icon: User },
    { name: 'Guardian', path: '/login/guardian', icon: Users },
    { name: 'Faculty', path: '/login/faculty', icon: BookOpen },
    { name: 'Member', path: '/login/student', icon: GraduationCap },
    { name: 'Supervisor', path: '/login/supervisor', icon: RadioTower },
  ];

  useEffect(() => {
    const forceRole = searchParams.get('force');
    const clearForce = searchParams.get('clear');

    if (clearForce) {
      localStorage.removeItem('forcedRole');
      router.replace('/login');
      return;
    }

    if (forceRole) {
      const roleExists = roles.find(r => r.path === `/login/${forceRole}`);
      if (roleExists) {
        localStorage.setItem('forcedRole', `/login/${forceRole}`);
        router.replace(`/login/${forceRole}`);
        return;
      }
    }

    // Check for existing forced role
    const storedForce = localStorage.getItem('forcedRole');
    if (storedForce) {
      router.replace(storedForce);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-base)] p-4 sm:p-8">
      <h1 className="text-3xl font-bold mb-10 text-[var(--text-primary)]">Select Portal</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 w-full max-w-3xl">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Link 
              key={role.name} 
              href={role.path} 
              className="glass-card p-4 rounded-3xl text-left border-slate-800/50 hover:border-indigo-500/50 hover:cursor-pointer transition-all duration-300 ease-out flex flex-col gap-3 shadow-sm hover:shadow-lg hover:shadow-indigo-500/30 ring-1 ring-white/5 hover:ring-indigo-500/30"
            >
              <div className="p-3 rounded-2xl w-fit transition-colors duration-300 bg-indigo-500/10 text-indigo-400">
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{role.name} Portal</span>
            </Link>
          );
        })}
      </div>
      <p className="mt-8 text-xs text-slate-500">
        To force a portal, use: <code>/login?force=admin</code>. To clear: <code>/login?clear=true</code>.
      </p>
    </div>
  );
}

