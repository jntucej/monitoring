import React from 'react';
import { PersonType } from '@/lib/types';
import { User, GraduationCap, Briefcase, Wrench, UserCheck, HeartHandshake } from 'lucide-react';

interface PersonBadgeProps {
  type: PersonType | string;
  className?: string;
  showIcon?: boolean;
}

export const PersonBadge: React.FC<PersonBadgeProps> = ({
  type,
  className = '',
  showIcon = true,
}) => {
  const normalizedType = (type || 'student').toLowerCase() as PersonType;

  const config: Record<PersonType, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
    student: {
      label: 'Student',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      icon: <GraduationCap className="w-3.5 h-3.5 mr-1" />,
    },
    faculty: {
      label: 'Faculty',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      icon: <Briefcase className="w-3.5 h-3.5 mr-1" />,
    },
    staff: {
      label: 'Staff',
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
      icon: <UserCheck className="w-3.5 h-3.5 mr-1" />,
    },
    worker: {
      label: 'Worker',
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/20',
      icon: <Wrench className="w-3.5 h-3.5 mr-1" />,
    },
    visitor: {
      label: 'Visitor',
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'border-orange-500/20',
      icon: <User className="w-3.5 h-3.5 mr-1" />,
    },
    parent: {
      label: 'Parent',
      bg: 'bg-teal-500/10',
      text: 'text-teal-400',
      border: 'border-teal-500/20',
      icon: <HeartHandshake className="w-3.5 h-3.5 mr-1" />,
    },
  };

  const current = config[normalizedType] || config.student;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.bg} ${current.text} ${current.border} ${className}`}
    >
      {showIcon && current.icon}
      {current.label}
    </span>
  );
};
