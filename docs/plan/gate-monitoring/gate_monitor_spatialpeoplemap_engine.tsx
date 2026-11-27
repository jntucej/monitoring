'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

/**
 * ============================================================================
 * GATE MONITOR — REUSABLE <SpatialPeopleMap /> ENGINE
 * Architecture:
 *  - Macro (Top KPI Strip) -> Meso (Constellation <-> Org Chart SVG) -> Micro (Inspector)
 *  - Cubic Hermite Smoothstep Interpolation (MORPH_MS = 1150, LAYOUT_MS = 720)
 *  - 5 Scoped Data Adapters plugged into one reusable visualization component
 * ============================================================================
 */

// Animation & Physics Constants
const LAYOUT_MS = 720;
const MORPH_MS = 1150;
const INTRO_MS = 1150;
const FLASH_MS = 1600;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Signature Semantic Hues (Consistent across Pills, Halos, Nodes & Links)
const HUES = {
  indigo: { hex: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE', text: '#3730A3', label: 'IT / CSE' },
  violet: { hex: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6', label: 'ECE / EEE / ME' },
  emerald: { hex: '#059669', bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', label: 'Hostel & Mess' },
  amber: { hex: '#D97706', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', label: 'Exam Branch' },
  navy: { hex: '#0F172A', bg: '#F1F5F9', border: '#CBD5E1', text: '#0F172A', label: 'Security & Exec' },
  rose: { hex: '#E11D48', bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239', label: 'Alert / Exception' }
};

/**
 * Clean Inline SVG Icon System (Zero external CDN dependency failures)
 */
const Icon = ({ name, className = 'w-4 h-4' }) => {
  const props = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  };

  switch (name) {
    case 'orbit':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'tree':
      return (
        <svg {...props}>
          <rect x="9" y="2" width="6" height="5" rx="1" />
          <rect x="2" y="17" width="6" height="5" rx="1" />
          <rect x="16" y="17" width="6" height="5" rx="1" />
          <path d="M12 7v5M5 17v-3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'building':
      return (
        <svg {...props}>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
        </svg>
      );
    case 'graduation':
      return (
        <svg {...props}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
    case 'home':
      return (
        <svg {...props}>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg {...props}>
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...props}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'arrowRight':
      return (
        <svg {...props}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      );
    case 'external':
      return (
        <svg {...props}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      );
    case 'swap':
      return (
        <svg {...props}>
          <path d="m16 3 4 4-4 4" />
          <path d="M20 7H4" />
          <path d="m8 21-4-4 4-4" />
          <path d="M4 17h16" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'eyeOff':
      return (
        <svg {...props}>
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
      );
    case 'zoomIn':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      );
    case 'x':
      return (
        <svg {...props}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...props}>
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        </svg>
      );
    default:
      return null;
  }
};

/**
 * ============================================================================
 * 5 SCOPED AREA DATA ADAPTERS (Normalized { kpis, clusters, nodes, delegations })
 * ============================================================================
 */
const AREA_ADAPTERS = {
  // --------------------------------------------------------------------------
  // AREA 1: INSTITUTIONAL COMMAND MAP (Principal / VP / Dean / Admin)
  // --------------------------------------------------------------------------
  institutional: {
    id: 'institutional',
    shortTitle: '1. Institutional Command',
    title: 'Institutional Command Map',
    subtitle: 'Executive governance, B.Tech/M.Tech academic units, Hostel, Security & Exam Branch',
    personaBadge: 'Principal / VP / Admin',
    icon: 'building',
    coveragePct: 94,
    coverageLabel: 'Campus Staff On-Duty',
    defaultSelectedId: 'p_vp',
    kpis: [
      { label: 'Active Campus Staff', value: '312', delta: '+94.2% present', tone: 'emerald', sub: 'Faculty: 218 · Ops: 94' },
      { label: 'On-Leave / Uncovered', value: '14', delta: '3 sub pending', tone: 'amber', sub: '4 leave approvals queued' },
      { label: 'Active Delegations', value: '1', delta: 'Principal → VP', tone: 'indigo', sub: 'Expires in 04h 18m' },
      { label: 'Pending Escalations', value: '5', delta: '2 high priority', tone: 'rose', sub: 'Hostel & Gate logs' }
    ],
    clusters: [
      { id: 'c_exec', label: 'Executive & Delegations', hue: 'navy', count: 3 },
      { id: 'c_it_cse', label: 'IT & CSE Depts', hue: 'indigo', count: 2 },
      { id: 'c_core_eng', label: 'ECE, EEE & ME', hue: 'violet', count: 3 },
      { id: 'c_mtech', label: 'M.Tech PG Cell', hue: 'indigo', count: 1 },
      { id: 'c_hostel', label: 'Hostel & Mess Ops', hue: 'emerald', count: 2 },
      { id: 'c_gate', label: 'Gate Security', hue: 'navy', count: 1 },
      { id: 'c_exam', label: 'Exam Branch (OIE)', hue: 'amber', count: 1 }
    ],
    delegations: [
      {
        fromId: 'p_prin',
        toId: 'p_vp',
        label: 'Acting Authority · 04h 18m left',
        reason: 'Principal at State Higher Education Council'
      }
    ],
    nodes: [
      {
        id: 'p_prin',
        uuid: 'usr_0194a8b2-prin-001',
        code: 'EMP-1001',
        name: 'Dr. R. Subramanian',
        initials: 'RS',
        role: 'Principal',
        roleContexts: ['Chief Warden', 'Chief Superintendent'],
        clusterId: 'c_exec',
        parentId: null,
        tier: 0,
        status: 'delegated',
        statusText: 'On Official Duty (Delegated)',
        scope: 'All Campus & Autonomous Cells',
        todaySchedule: ['09:00–13:00 APSCHE Council Meet', 'Authority delegated to VP'],
        weekRoster: ['OD', 'On', 'On', 'On', 'OD'],
        deepLinks: [
          { label: 'Approval Queue (4)', route: '/principal/approvals', type: 'primary' },
          { label: 'Delegation Audit', route: '/principal/delegations', type: 'secondary' }
        ]
      },
      {
        id: 'p_vp',
        uuid: 'usr_0194a8b2-vp-002',
        code: 'EMP-1002',
        name: 'Dr. Kavitha Menon',
        initials: 'KM',
        role: 'Vice Principal (Acting Head)',
        roleContexts: ['Acting Principal', 'Academic Council'],
        clusterId: 'c_exec',
        parentId: 'p_prin',
        tier: 1,
        status: 'online',
        statusText: 'Active · Holding Delegated Sign-off',
        scope: 'Academics, Discipline & Approvals',
        todaySchedule: ['09:30–11:00 HOD Morning Standup', '14:00–16:00 Pending Approvals'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'VP Approvals (4)', route: '/vice-principal/approvals', type: 'primary' },
          { label: 'Campus Roster', route: '/vice-principal/roster', type: 'secondary' }
        ]
      },
      {
        id: 'p_dean',
        uuid: 'usr_0194a8b2-dean-003',
        code: 'EMP-1004',
        name: 'Dr. S. V. Narayana',
        initials: 'SN',
        role: 'Dean of Academics',
        roleContexts: ['IQAC Chair'],
        clusterId: 'c_exec',
        parentId: 'p_prin',
        tier: 1,
        status: 'online',
        statusText: 'Active · Curriculum Audit',
        scope: 'B.Tech & M.Tech Regulations',
        todaySchedule: ['10:00–12:00 NBA Accreditation Review', '15:00–16:30 Lab Timetable Sync'],
        weekRoster: ['On', 'On', 'Leave', 'On', 'On'],
        deepLinks: [
          { label: 'Academic Matrix', route: '/dean/academics', type: 'primary' }
        ]
      },
      {
        id: 'p_hod_it',
        uuid: 'usr_0194a8b2-hod-it-004',
        code: 'FAC-IT-01',
        name: 'Dr. Ananya Deshmukh',
        initials: 'AD',
        role: 'HOD — Information Technology',
        roleContexts: ['BoS Chair (IT)'],
        clusterId: 'c_it_cse',
        parentId: 'p_vp',
        tier: 2,
        status: 'online',
        statusText: 'Active · 34/36 Faculty Present',
        scope: 'B.Tech IT (360 Students)',
        todaySchedule: ['09:15–10:15 Dept Morning Briefing', '11:30–12:30 3rd Yr IT-A Review'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        switchAreaOnClick: 'department',
        deepLinks: [
          { label: 'Open IT Dept Map →', route: '/hod/department-map?dept=IT', type: 'primary', switchArea: 'department' },
          { label: 'HOD Schedule', route: '/hod/schedule', type: 'secondary' }
        ]
      },
      {
        id: 'p_hod_cse',
        uuid: 'usr_0194a8b2-hod-cse-005',
        code: 'FAC-CS-01',
        name: 'Dr. Vikramaditya Rao',
        initials: 'VR',
        role: 'HOD — Computer Science',
        roleContexts: ['AI Lab Lead'],
        clusterId: 'c_it_cse',
        parentId: 'p_vp',
        tier: 2,
        status: 'online',
        statusText: 'Active · 48/50 Faculty Present',
        scope: 'B.Tech CSE & AI-ML (540 Students)',
        todaySchedule: ['10:00–12:00 Project Expo Jury', '14:00–15:00 Placement Readiness'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'Open CSE Dept Map →', route: '/hod/department-map?dept=CSE', type: 'primary', switchArea: 'department' }
        ]
      },
      {
        id: 'p_hod_ece',
        uuid: 'usr_0194a8b2-hod-ece-006',
        code: 'FAC-EC-01',
        name: 'Dr. Meenakshi Sundaram',
        initials: 'MS',
        role: 'HOD — Electronics (ECE)',
        roleContexts: ['VLSI Center'],
        clusterId: 'c_core_eng',
        parentId: 'p_vp',
        tier: 2,
        status: 'leave',
        statusText: 'On Leave · Senior Prof In-Charge',
        scope: 'B.Tech ECE (360 Students)',
        todaySchedule: ['Approved Casual Leave (1 Day)', 'Covered by Dr. K. Harish'],
        weekRoster: ['On', 'On', 'On', 'On', 'Leave'],
        deepLinks: [
          { label: 'View Sub Roster', route: '/hod/schedule?dept=ECE', type: 'primary' }
        ]
      },
      {
        id: 'p_hod_eee',
        uuid: 'usr_0194a8b2-hod-eee-007',
        code: 'FAC-EE-01',
        name: 'Dr. Prakash Kulkarni',
        initials: 'PK',
        role: 'HOD — Electrical (EEE)',
        roleContexts: ['Campus Solar Grid'],
        clusterId: 'c_core_eng',
        parentId: 'p_vp',
        tier: 2,
        status: 'online',
        statusText: 'Active · 24/25 Faculty Present',
        scope: 'B.Tech EEE (240 Students)',
        todaySchedule: ['09:30–11:30 Power Systems Lab', '15:00–16:00 Energy Audit'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'EEE Dept Schedule', route: '/hod/schedule?dept=EEE', type: 'primary' }
        ]
      },
      {
        id: 'p_hod_me',
        uuid: 'usr_0194a8b2-hod-me-008',
        code: 'FAC-ME-01',
        name: 'Dr. Harpreet Singh Gill',
        initials: 'HG',
        role: 'HOD — Mechanical (ME)',
        roleContexts: ['Central Workshop'],
        clusterId: 'c_core_eng',
        parentId: 'p_vp',
        tier: 2,
        status: 'online',
        statusText: 'Active · Workshop Shift A Live',
        scope: 'B.Tech ME (240 Students)',
        todaySchedule: ['10:00–13:00 CAD/CAM Lab Supervision'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'ME Dept Schedule', route: '/hod/schedule?dept=ME', type: 'primary' }
        ]
      },
      {
        id: 'p_mtech',
        uuid: 'usr_0194a8b2-pg-009',
        code: 'FAC-PG-01',
        name: 'Dr. Nandini Chatterjee',
        initials: 'NC',
        role: 'PG Coordinator — M.Tech',
        roleContexts: ['Research & PhD Cell'],
        clusterId: 'c_mtech',
        parentId: 'p_dean',
        tier: 2,
        status: 'online',
        statusText: 'Active · Thesis Viva Day',
        scope: 'M.Tech CSE, VLSI & Structural',
        todaySchedule: ['09:30–13:30 M.Tech Dissertation Viva'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'PG Research Roster', route: '/dean/mtech-cohorts', type: 'primary' }
        ]
      },
      {
        id: 'p_hostel_mgr',
        uuid: 'usr_0194a8b2-hst-010',
        code: 'OPS-HST-01',
        name: 'Capt. Arvind Nair (Retd.)',
        initials: 'AN',
        role: 'Chief Hostel Manager',
        roleContexts: ['Reports to Chief Warden'],
        clusterId: 'c_hostel',
        parentId: 'p_prin',
        tier: 1,
        status: 'online',
        statusText: 'Active · 96.4% Occupancy · 3 Overdue',
        scope: '4 Hostel Blocks + Central Mess',
        todaySchedule: ['08:00–09:00 Night Curfew Reconciliation', '16:30–18:00 Mess Hygiene Check'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'Open Hostel Ops Map →', route: '/hostel-manager/rooms', type: 'primary', switchArea: 'hostel' },
          { label: 'Returns Timeline', route: '/hostel/returns-timeline', type: 'secondary' }
        ]
      },
      {
        id: 'p_sec_sup',
        uuid: 'usr_0194a8b2-sec-011',
        code: 'SEC-SUP-01',
        name: 'Insp. Rajendra Prasad',
        initials: 'RP',
        role: 'Chief Security Supervisor',
        roleContexts: ['Gate Monitor Lead'],
        clusterId: 'c_gate',
        parentId: 'p_prin',
        tier: 1,
        status: 'online',
        statusText: 'Active · All 3 Gates Online (Shift A)',
        scope: 'Main, Hostel & Parking Gates',
        todaySchedule: ['06:00–14:00 Shift A Command', '13:45 Shift B Handover Audit'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'Open Gate Security Map →', route: '/supervisor/gates/live', type: 'primary', switchArea: 'security' },
          { label: 'Shift Roster', route: '/supervisor/team/shifts', type: 'secondary' }
        ]
      },
      {
        id: 'p_oie',
        uuid: 'usr_0194a8b2-oie-012',
        code: 'EXM-OIE-01',
        name: 'Prof. Raghavendra Joshi',
        initials: 'RJ',
        role: 'Officer In-Charge of Exams (OIE)',
        roleContexts: ['Reports to Chief Sup'],
        clusterId: 'c_exam',
        parentId: 'p_prin',
        tier: 1,
        status: 'online',
        statusText: 'Active · Mid-II Session 1 Live',
        scope: 'Exam Branch & Hall Allocation',
        todaySchedule: ['09:00–12:00 FN Exam Session', '12:15 Candidate Reconciliation'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'Open Exam Hall Map →', route: '/oie/candidate-attendance', type: 'primary', switchArea: 'exam' }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // AREA 2: DEPARTMENT & CLASS MAP (HOD / Faculty - IT Department)
  // Includes Dynamic Class Zoom (Aggregated Cluster -> Individual Student Nodes)
  // --------------------------------------------------------------------------
  department: {
    id: 'department',
    shortTitle: '2. Dept & Class Map',
    title: 'IT Department & Class Section Map',
    subtitle: 'HOD → Faculty → Subjects, Labs, Mentor Cohorts & Class Sections (with Drill-Down)',
    personaBadge: 'HOD / Faculty (IT Dept)',
    icon: 'graduation',
    coveragePct: 91,
    coverageLabel: 'IT Timetable Coverage',
    defaultSelectedId: 'd_fac_absent',
    kpis: [
      { label: 'IT Faculty Present', value: '18 / 20', delta: '2 on leave', tone: 'amber', sub: '1 substitute required now' },
      { label: 'Live Lectures & Labs', value: '9', delta: 'Period 2 active', tone: 'indigo', sub: '3 Labs · 6 Theory rooms' },
      { label: 'IT Student Presence', value: '342 / 360', delta: '95.0% on-campus', tone: 'emerald', sub: '11 on gate pass · 7 absent' },
      { label: 'Attendance <75% Flags', value: '14', delta: '4 in 3rd Yr IT-A', tone: 'rose', sub: 'Mentor alerts triggered' }
    ],
    clusters: [
      { id: 'dc_hod', label: 'HOD & Academic Office', hue: 'navy', count: 1 },
      { id: 'dc_subjects', label: 'Core Theory Faculty', hue: 'indigo', count: 3 },
      { id: 'dc_labs', label: 'Cloud & AI Labs', hue: 'violet', count: 2 },
      { id: 'dc_sections', label: 'Class Sections & Mentors', hue: 'emerald', count: 3 }
    ],
    delegations: [],
    nodes: [
      {
        id: 'd_hod',
        uuid: 'usr_0194a8b2-hod-it-004',
        code: 'FAC-IT-01',
        name: 'Dr. Ananya Deshmukh',
        initials: 'AD',
        role: 'HOD — Information Technology',
        roleContexts: ['BoS Chair (IT)', 'Dept Approver'],
        clusterId: 'dc_hod',
        parentId: null,
        tier: 0,
        status: 'online',
        statusText: 'Active · Dept Control Room',
        scope: 'IT Faculty & 6 Class Sections',
        todaySchedule: ['09:30–10:30 Distributed Systems (4th Yr)', '11:00–12:00 Substitute Allocation'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'HOD Master Schedule', route: '/hod/schedule', type: 'primary' },
          { label: 'Back to Institutional Map', route: '/principal/org-map', type: 'secondary', switchArea: 'institutional' }
        ]
      },
      {
        id: 'd_fac_1',
        uuid: 'usr_0194a8b2-fac-it-104',
        code: 'FAC-IT-14',
        name: 'Prof. Karthik Subramanian',
        initials: 'KS',
        role: 'Associate Professor · Web Tech',
        roleContexts: ['Class Advisor: 3rd Yr IT-A'],
        clusterId: 'dc_subjects',
        parentId: 'd_hod',
        tier: 1,
        status: 'online',
        statusText: 'In Live Lecture · Room LH-302',
        scope: '3rd Year IT-A (60 Students)',
        todaySchedule: ['09:00–10:00 Full-Stack Web Tech (LH-302)', '14:00–16:00 Web Tech Lab'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'Open 3rd Yr IT-A Class', route: '/faculty/class/3-IT-A', type: 'primary' },
          { label: 'Class Group /chat', route: '/chat?room=3-IT-A', type: 'secondary' }
        ]
      },
      {
        id: 'd_fac_absent',
        uuid: 'usr_0194a8b2-fac-it-109',
        code: 'FAC-IT-19',
        name: 'Prof. Sneha Kulkarni',
        initials: 'SK',
        role: 'Assistant Professor · Compiler Design',
        roleContexts: ['Needs Substitute (10:00 AM)'],
        clusterId: 'dc_subjects',
        parentId: 'd_hod',
        tier: 1,
        status: 'leave',
        statusText: 'On Medical Leave · Uncovered Slot!',
        scope: '3rd Year IT-A & 3rd Year IT-B',
        todaySchedule: ['10:00–11:00 Compiler Design (UNCOVERED)', '11:00–12:00 Mentor Cohort B'],
        weekRoster: ['On', 'On', 'On', 'Leave', 'Leave'],
        requiresSubstitute: true,
        substituteAssigned: null,
        deepLinks: [
          { label: 'Assign Substitute Faculty', route: '/hod/substitute-picker', type: 'action_substitute' },
          { label: 'Notify 3rd Yr IT-A /chat', route: '/chat?room=3-IT-A', type: 'secondary' }
        ]
      },
      {
        id: 'd_fac_2',
        uuid: 'usr_0194a8b2-fac-it-112',
        code: 'FAC-IT-22',
        name: 'Dr. Mohammed Irfan',
        initials: 'MI',
        role: 'Associate Professor · Cloud Computing',
        roleContexts: ['Available for Sub (10:00 AM)'],
        clusterId: 'dc_labs',
        parentId: 'd_hod',
        tier: 1,
        status: 'online',
        statusText: 'Free Period · Eligible Substitute',
        scope: 'Cloud & DevOps Lab (Block C)',
        todaySchedule: ['09:00–10:00 Free Slot (Available)', '10:00–13:00 Cloud Computing Lab'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'View Faculty Timetable', route: '/faculty/schedule/FAC-IT-22', type: 'primary' }
        ]
      },
      {
        id: 'd_fac_3',
        uuid: 'usr_0194a8b2-fac-it-118',
        code: 'FAC-IT-28',
        name: 'Prof. Divya Krishnan',
        initials: 'DK',
        role: 'Assistant Professor · Data Mining',
        roleContexts: ['Mentor Cohort: 2nd Yr IT'],
        clusterId: 'dc_labs',
        parentId: 'd_hod',
        tier: 1,
        status: 'online',
        statusText: 'In Lab Session · AI Lab 2',
        scope: '2nd Year IT (62 Students)',
        todaySchedule: ['09:00–12:00 Python & Data Mining Lab'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'Open 2nd Yr IT Class', route: '/faculty/class/2-IT', type: 'primary' }
        ]
      },
      // Aggregated Class Section Cluster Nodes (Prevents 2,000+ raw node lag!)
      {
        id: 'd_cls_3ita',
        uuid: 'cls_0194a8b2-3ita-001',
        code: 'SEC-3-IT-A',
        name: '3rd Year IT-A (60 Students)',
        initials: '3A',
        role: 'Class Section · 57/60 On-Campus',
        roleContexts: ['Zoomable Cohort', '4 <75% Att.'],
        clusterId: 'dc_sections',
        parentId: 'd_fac_1',
        tier: 2,
        isAggregatedClass: true,
        status: 'online',
        statusText: '95.0% Present · 2 Out on Gate Pass',
        scope: 'Room LH-302 · Advisor: Prof. Karthik',
        todaySchedule: ['09:00 Web Tech (Live)', '10:00 Compiler Design (Needs Sub)'],
        weekRoster: ['96%', '94%', '95%', '93%', '95%'],
        deepLinks: [
          { label: 'Zoom Into Student Nodes', route: '#zoom-class', type: 'action_zoom' },
          { label: 'Open Class /chat', route: '/chat?room=3-IT-A', type: 'secondary' }
        ]
      },
      {
        id: 'd_cls_3itb',
        uuid: 'cls_0194a8b2-3itb-002',
        code: 'SEC-3-IT-B',
        name: '3rd Year IT-B (58 Students)',
        initials: '3B',
        role: 'Class Section · 55/58 On-Campus',
        roleContexts: ['Aggregate Cluster'],
        clusterId: 'dc_sections',
        parentId: 'd_fac_absent',
        tier: 2,
        isAggregatedClass: true,
        status: 'online',
        statusText: '94.8% Present · 3 Absent',
        scope: 'Room LH-304 · Advisor: Prof. Sneha',
        todaySchedule: ['09:00 Computer Networks', '11:00 Mentor Hour'],
        weekRoster: ['95%', '96%', '94%', '95%', '95%'],
        deepLinks: [
          { label: 'Open Class Roster', route: '/faculty/class/3-IT-B', type: 'primary' }
        ]
      },
      {
        id: 'd_cls_2it',
        uuid: 'cls_0194a8b2-2it-003',
        code: 'SEC-2-IT',
        name: '2nd Year IT (62 Students)',
        initials: '2A',
        role: 'Class Section · 60/62 On-Campus',
        roleContexts: ['In AI Lab 2'],
        clusterId: 'dc_sections',
        parentId: 'd_fac_3',
        tier: 2,
        isAggregatedClass: true,
        status: 'online',
        statusText: '96.7% Present · Lab Batch A & B',
        scope: 'AI Lab 2 · Advisor: Prof. Divya',
        todaySchedule: ['09:00–12:00 Data Mining Lab'],
        weekRoster: ['97%', '96%', '98%', '95%', '97%'],
        deepLinks: [
          { label: 'Open Class Roster', route: '/faculty/class/2-IT', type: 'primary' }
        ]
      }
    ],
    // Expanded Student Nodes when HOD/Faculty zooms into 3rd Year IT-A
    zoomedStudents: [
      { id: 'stu_1', uuid: 'stu_uuid_24JJ1A1240', code: '24JJ1A1240', name: 'Aarav Sharma', initials: 'AS', role: 'Student · 3rd Yr IT-A', roleContexts: ['Class Rep', '92% Att.'], clusterId: 'dc_sections', parentId: 'd_cls_3ita', tier: 3, status: 'online', statusText: 'On Campus · Checked in 08:42 AM', scope: '3rd Year IT-A · Day Scholar', todaySchedule: ['08:42 Main Gate RFID Entry', '09:00 LH-302 Present'], weekRoster: ['P', 'P', 'P', 'P', 'P'], deepLinks: [{ label: 'Student Profile', route: '/faculty/student/24JJ1A1240', type: 'primary' }] },
      { id: 'stu_2', uuid: 'stu_uuid_25JJ5A1203', code: '25JJ5A1203', name: 'Bhavya Srikanth', initials: 'BS', role: 'Student · 3rd Yr IT-A (Lateral)', roleContexts: ['Out on Gate Pass'], clusterId: 'dc_sections', parentId: 'd_cls_3ita', tier: 3, status: 'leave', statusText: 'Out on Approved Pass · Return 16:00', scope: '3rd Year IT-A · Girls Hostel 1', todaySchedule: ['10:15 Gate Pass #GP-884 Approved', 'Return due by 16:00'], weekRoster: ['P', 'P', 'P', 'P', 'Pass'], deepLinks: [{ label: 'Verify Gate Pass', route: '/hostel/returns-timeline?roll=25JJ5A1203', type: 'primary' }] },
      { id: 'stu_3', uuid: 'stu_uuid_24JJ1A1218', code: '24JJ1A1218', name: 'Charan Teja Reddy', initials: 'CR', role: 'Student · 3rd Yr IT-A', roleContexts: ['68.4% Att. (<75% Flag)'], clusterId: 'dc_sections', parentId: 'd_cls_3ita', tier: 3, status: 'alert', statusText: 'Absent Today · Attendance <75%', scope: '3rd Year IT-A · Mentor: Prof. Karthik', todaySchedule: ['No Gate Entry Logged Today', 'Condonation Alert Sent'], weekRoster: ['P', 'A', 'P', 'A', 'A'], deepLinks: [{ label: 'Log Mentor Call', route: '/faculty/mentor-notes/24JJ1A1218', type: 'primary' }] },
      { id: 'stu_4', uuid: 'stu_uuid_24JJ1A1252', code: '24JJ1A1252', name: 'Diya Malhotra', initials: 'DM', role: 'Student · 3rd Yr IT-A', roleContexts: ['96% Att.'], clusterId: 'dc_sections', parentId: 'd_cls_3ita', tier: 3, status: 'online', statusText: 'On Campus · LH-302', scope: '3rd Year IT-A · Girls Hostel 2', todaySchedule: ['08:50 LH-302 Biometric Verified'], weekRoster: ['P', 'P', 'P', 'P', 'P'], deepLinks: [{ label: 'Student Profile', route: '/faculty/student/24JJ1A1252', type: 'primary' }] },
      { id: 'stu_5', uuid: 'stu_uuid_24JJ1A1261', code: '24JJ1A1261', name: 'Eshwar Prasad', initials: 'EP', role: 'Student · 3rd Yr IT-A', roleContexts: ['72.1% Att. (<75% Flag)'], clusterId: 'dc_sections', parentId: 'd_cls_3ita', tier: 3, status: 'online', statusText: 'On Campus · Attendance Watch', scope: '3rd Year IT-A · Boys Hostel 1', todaySchedule: ['08:55 LH-302 Present'], weekRoster: ['A', 'P', 'A', 'P', 'P'], deepLinks: [{ label: 'Attendance Ledger', route: '/faculty/student/24JJ1A1261', type: 'primary' }] },
      { id: 'stu_6', uuid: 'stu_uuid_25JJ5A1209', code: '25JJ5A1209', name: 'Farhan Siddiqui', initials: 'FS', role: 'Student · 3rd Yr IT-A (Lateral)', roleContexts: ['89% Att.'], clusterId: 'dc_sections', parentId: 'd_cls_3ita', tier: 3, status: 'online', statusText: 'On Campus · LH-302', scope: '3rd Year IT-A · Day Scholar', todaySchedule: ['08:38 Main Gate Entry'], weekRoster: ['P', 'P', 'P', 'P', 'P'], deepLinks: [{ label: 'Student Profile', route: '/faculty/student/25JJ5A1209', type: 'primary' }] }
    ]
  },

  // --------------------------------------------------------------------------
  // AREA 3: GATE & SHIFT SECURITY MAP (Supervisor / Admin)
  // --------------------------------------------------------------------------
  security: {
    id: 'security',
    shortTitle: '3. Gate & Shift Security',
    title: 'Gate & Shift Security Map',
    subtitle: 'Physical perimeter gates, GPS/Kiosk worker check-ins, handover logs & overstay alerts',
    personaBadge: 'Security Supervisor / Admin',
    icon: 'shield',
    coveragePct: 92,
    coverageLabel: 'Gate Posts Manned',
    defaultSelectedId: 's_op_alert',
    kpis: [
      { label: 'Active Shift Guards', value: '12 / 13', delta: 'Shift A (06:00–14:00)', tone: 'emerald', sub: 'GPS + Kiosk verified' },
      { label: 'Live Gates Online', value: '3 / 3', delta: 'Zero lockdown', tone: 'navy', sub: 'Main · Hostel · Parking' },
      { label: 'Handover Pending', value: '1', delta: 'Parking Gate #3', tone: 'amber', sub: 'Relief guard en route' },
      { label: 'Overstay / Visitor Alerts', value: '2', delta: 'Main Gate Kiosk', tone: 'rose', sub: '2 visitors > 4h limit' }
    ],
    clusters: [
      { id: 'sc_cmd', label: 'Security Command', hue: 'navy', count: 1 },
      { id: 'sc_main', label: 'Main Gate (NH-65)', hue: 'indigo', count: 4 },
      { id: 'sc_hostel', label: 'Hostel Perimeter Gate', hue: 'emerald', count: 3 },
      { id: 'sc_parking', label: 'Parking & Logistics Gate', hue: 'amber', count: 2 }
    ],
    delegations: [],
    nodes: [
      {
        id: 's_sup',
        uuid: 'usr_0194a8b2-sec-011',
        code: 'SEC-SUP-01',
        name: 'Insp. Rajendra Prasad',
        initials: 'RP',
        role: 'Chief Security Supervisor',
        roleContexts: ['Shift A Commander'],
        clusterId: 'sc_cmd',
        parentId: null,
        tier: 0,
        status: 'online',
        statusText: 'Active · Central Control Room',
        scope: 'All 3 Campus Perimeter Gates',
        todaySchedule: ['06:00–14:00 Shift A Oversight', '13:45 Shift B Briefing'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'Live Gate Telemetry', route: '/supervisor/gates/live', type: 'primary' },
          { label: 'Shift Roster Grid', route: '/supervisor/team/shifts', type: 'secondary' }
        ]
      },
      {
        id: 's_lead_main',
        uuid: 'usr_0194a8b2-sec-101',
        code: 'SEC-LD-01',
        name: 'Sgt. Balwinder Singh',
        initials: 'BS',
        role: 'Shift Lead · Main Gate',
        roleContexts: ['Kiosk #1 & #2'],
        clusterId: 'sc_main',
        parentId: 's_sup',
        tier: 1,
        status: 'online',
        statusText: 'GPS Verified · 1,420 Entries Today',
        scope: 'Main Entrance & Visitor Desk',
        todaySchedule: ['06:00–14:00 Main Gate Turnstiles'],
        weekRoster: ['On', 'On', 'On', 'Off', 'On'],
        deepLinks: [
          { label: 'Main Gate Logs', route: '/supervisor/gates/live?gate=main', type: 'primary' }
        ]
      },
      {
        id: 's_op_1',
        uuid: 'usr_0194a8b2-sec-102',
        code: 'GRD-204',
        name: 'Suresh Goud',
        initials: 'SG',
        role: 'Kiosk Operator · Turnstile A',
        roleContexts: ['RFID + Face Kiosk'],
        clusterId: 'sc_main',
        parentId: 's_lead_main',
        tier: 2,
        status: 'online',
        statusText: 'Checked-in 05:54 AM (GPS OK)',
        scope: 'Main Gate Lane 1',
        todaySchedule: ['06:00–14:00 Student & Faculty Scan'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'Worker Shift Log', route: '/supervisor/team/shifts?worker=GRD-204', type: 'primary' }
        ]
      },
      {
        id: 's_op_alert',
        uuid: 'usr_0194a8b2-sec-103',
        code: 'GRD-208',
        name: 'Maheshwari Devi',
        initials: 'MD',
        role: 'Visitor Desk Operator',
        roleContexts: ['2 Overstay Alerts'],
        clusterId: 'sc_main',
        parentId: 's_lead_main',
        tier: 2,
        status: 'alert',
        statusText: 'Alert · 2 Vendor Passes Overstayed',
        scope: 'Main Gate Visitor Kiosk',
        todaySchedule: ['06:00–14:00 Visitor Badge Issue', 'Action: Escalate Overstay #V-41'],
        weekRoster: ['On', 'On', 'Off', 'On', 'On'],
        deepLinks: [
          { label: 'Resolve Overstay Alerts', route: '/supervisor/gates/live?alert=overstay', type: 'primary' },
          { label: 'Reassign Shift', route: '/supervisor/team/shifts', type: 'secondary' }
        ]
      },
      {
        id: 's_op_2',
        uuid: 'usr_0194a8b2-sec-104',
        code: 'GRD-211',
        name: 'Ramesh Naik',
        initials: 'RN',
        role: 'Field Patrol Guard',
        roleContexts: ['Perimeter Beat'],
        clusterId: 'sc_main',
        parentId: 's_lead_main',
        tier: 2,
        status: 'online',
        statusText: 'GPS Ping 2m ago · North Fence',
        scope: 'Main Gate to Admin Block',
        todaySchedule: ['06:00–14:00 Mobile Patrol'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'GPS Attendance Log', route: '/supervisor/team/shifts', type: 'primary' }
        ]
      },
      {
        id: 's_lead_hst',
        uuid: 'usr_0194a8b2-sec-201',
        code: 'SEC-LD-02',
        name: 'K. Venkatachalam',
        initials: 'KV',
        role: 'Shift Lead · Hostel Gate',
        roleContexts: ['Outpass Scanner'],
        clusterId: 'sc_hostel',
        parentId: 's_sup',
        tier: 1,
        status: 'online',
        statusText: 'Active · Outpass Sync Online',
        scope: 'Hostel Internal Gate',
        todaySchedule: ['06:00–14:00 Hostel Outpass Verification'],
        weekRoster: ['On', 'Off', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'Hostel Gate Feed', route: '/supervisor/gates/live?gate=hostel', type: 'primary' }
        ]
      },
      {
        id: 's_op_hst1',
        uuid: 'usr_0194a8b2-sec-202',
        code: 'GRD-302',
        name: 'Padma Kumari',
        initials: 'PK',
        role: 'Girls Hostel Gate Guard',
        roleContexts: ['Biometric Kiosk'],
        clusterId: 'sc_hostel',
        parentId: 's_lead_hst',
        tier: 2,
        status: 'online',
        statusText: 'Checked-in 05:58 AM',
        scope: 'Girls Hostel Wing Entrance',
        todaySchedule: ['06:00–14:00 Gate Duty'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'Shift Details', route: '/supervisor/team/shifts', type: 'primary' }
        ]
      },
      {
        id: 's_op_hst2',
        uuid: 'usr_0194a8b2-sec-203',
        code: 'GRD-305',
        name: 'Imran Pasha',
        initials: 'IP',
        role: 'Boys Hostel Gate Guard',
        roleContexts: ['Turnstile B'],
        clusterId: 'sc_hostel',
        parentId: 's_lead_hst',
        tier: 2,
        status: 'online',
        statusText: 'Checked-in 05:50 AM',
        scope: 'Boys Hostel Wing Entrance',
        todaySchedule: ['06:00–14:00 Gate Duty'],
        weekRoster: ['On', 'On', 'On', 'On', 'Off'],
        deepLinks: [
          { label: 'Shift Details', route: '/supervisor/team/shifts', type: 'primary' }
        ]
      },
      {
        id: 's_lead_pkg',
        uuid: 'usr_0194a8b2-sec-301',
        code: 'SEC-LD-03',
        name: 'D. Srinivasulu',
        initials: 'DS',
        role: 'Shift Lead · Parking & Fleet',
        roleContexts: ['ANPR Camera Gate'],
        clusterId: 'sc_parking',
        parentId: 's_sup',
        tier: 1,
        status: 'online',
        statusText: 'Active · 18 College Buses Logged',
        scope: 'Transport & Parking Gate',
        todaySchedule: ['06:00–14:00 Bus Fleet & Staff Parking'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'Parking Gate Live', route: '/supervisor/gates/live?gate=parking', type: 'primary' }
        ]
      },
      {
        id: 's_op_pkg1',
        uuid: 'usr_0194a8b2-sec-302',
        code: 'GRD-401',
        name: 'Naresh Yadav',
        initials: 'NY',
        role: 'Parking Barrier Operator',
        roleContexts: ['Handover Pending'],
        clusterId: 'sc_parking',
        parentId: 's_lead_pkg',
        tier: 2,
        status: 'leave',
        statusText: 'Handover Pending · Relief Delayed',
        scope: 'South Logistics Gate',
        todaySchedule: ['Extended 30m awaiting relief guard'],
        weekRoster: ['On', 'On', 'On', 'On', 'Handover'],
        deepLinks: [
          { label: 'Dispatch Relief Guard', route: '/supervisor/team/shifts', type: 'primary' }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // AREA 4: HOSTEL & MESS OPS MAP (Hostel Manager / Chief Warden / Deputy)
  // Includes "VP Privacy Mode" toggle (aggregate-only PII protection)
  // --------------------------------------------------------------------------
  hostel: {
    id: 'hostel',
    shortTitle: '4. Hostel & Mess Ops',
    title: 'Hostel & Central Mess Operations Map',
    subtitle: '4 Residential Blocks (Boys 1/2, Girls 1/2) + Central Mess · Curfew & Returns Tracking',
    personaBadge: 'Chief Warden / Hostel Manager',
    icon: 'home',
    coveragePct: 96,
    coverageLabel: 'Curfew Reconciliation',
    defaultSelectedId: 'h_dw_b2',
    kpis: [
      { label: 'Total Hostel Occupancy', value: '1,184 / 1,240', delta: '95.5% full', tone: 'emerald', sub: 'Boys: 640 · Girls: 544' },
      { label: 'Curfew Compliance', value: '99.7%', delta: '3 overdue returns', tone: 'rose', sub: 'Escalated to Deputy Wardens' },
      { label: 'Open Maintenance', value: '7', delta: '2 plumbing · 5 electrical', tone: 'amber', sub: 'Avg SLA: 3.2 hrs' },
      { label: 'Mess Meal Count', value: '1,140', delta: 'Lunch prep active', tone: 'indigo', sub: 'Central Kitchen Online' }
    ],
    clusters: [
      { id: 'hc_exec', label: 'Warden Command', hue: 'navy', count: 2 },
      { id: 'hc_boys', label: 'Boys Hostels 1 & 2', hue: 'indigo', count: 4 },
      { id: 'hc_girls', label: 'Girls Hostels 1 & 2', hue: 'violet', count: 4 },
      { id: 'hc_mess', label: 'Central Mess Ops', hue: 'emerald', count: 1 }
    ],
    delegations: [],
    nodes: [
      {
        id: 'h_cw',
        uuid: 'usr_0194a8b2-prin-001',
        code: 'EMP-1001',
        name: 'Dr. R. Subramanian',
        initials: 'RS',
        role: 'Chief Warden (Principal Hat)',
        roleContexts: ['role_context: chief_warden'],
        clusterId: 'hc_exec',
        parentId: null,
        tier: 0,
        status: 'online',
        statusText: 'Active · Chief Warden Authority',
        scope: 'All 4 Hostels & Mess Committee',
        todaySchedule: ['08:30 Overnight Curfew Exception Sign-off'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'Curfew Oversight', route: '/deputy-warden/curfew-oversight', type: 'primary' }
        ]
      },
      {
        id: 'h_mgr',
        uuid: 'usr_0194a8b2-hst-010',
        code: 'OPS-HST-01',
        name: 'Capt. Arvind Nair (Retd.)',
        initials: 'AN',
        role: 'Chief Hostel Manager',
        roleContexts: ['Room Allocation & Maintenance'],
        clusterId: 'hc_exec',
        parentId: 'h_cw',
        tier: 1,
        status: 'online',
        statusText: 'Active · 1,184 Residents Tracked',
        scope: 'Boys 1/2, Girls 1/2 & Central Mess',
        todaySchedule: ['09:00–11:00 Maintenance Ticket Triage', '17:00–19:00 Evening Roll-Call Sync'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        deepLinks: [
          { label: 'Room Allocation Grid', route: '/hostel-manager/rooms', type: 'primary' },
          { label: 'Returns Timeline', route: '/hostel/returns-timeline', type: 'secondary' }
        ]
      },
      {
        id: 'h_dw_b1',
        uuid: 'usr_0194a8b2-dw-b1',
        code: 'WRD-B01',
        name: 'Dr. T. Gopalakrishna',
        initials: 'TG',
        role: 'Deputy Warden · Boys Hostel 1',
        roleContexts: ['320/330 Beds · 100% Curfew'],
        clusterId: 'hc_boys',
        parentId: 'h_mgr',
        tier: 2,
        status: 'online',
        statusText: 'All 320 Residents Accounted For',
        scope: 'Boys Hostel 1 (1st & 2nd Year)',
        todaySchedule: ['07:30 Morning Attendance Verified', '21:30 Night Curfew Check'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        aggregateSummary: 'Boys Block 1: 97% Occupancy · 0 Overdue · 1 Ticket',
        deepLinks: [
          { label: 'Boys Hostel 1 Rooms', route: '/hostel-manager/rooms?block=B1', type: 'primary' }
        ]
      },
      {
        id: 'h_ct_b1',
        uuid: 'usr_0194a8b2-ct-b1',
        code: 'CRT-B01',
        name: 'K. Ramesh Babu',
        initials: 'KR',
        role: 'Resident Caretaker · Boys 1',
        roleContexts: ['1 Open Plumbing Ticket'],
        clusterId: 'hc_boys',
        parentId: 'h_dw_b1',
        tier: 3,
        status: 'online',
        statusText: 'On Duty · Floor 2 Maintenance',
        scope: 'Boys Hostel 1 Ground Desk',
        todaySchedule: ['08:00–20:00 Block Caretaker Shift'],
        weekRoster: ['On', 'On', 'On', 'Off', 'On'],
        aggregateSummary: 'Block 1 Desk: Routine Maintenance Active',
        deepLinks: [
          { label: 'Maintenance Log', route: '/hostel-manager/rooms?tab=tickets', type: 'primary' }
        ]
      },
      {
        id: 'h_dw_b2',
        uuid: 'usr_0194a8b2-dw-b2',
        code: 'WRD-B02',
        name: 'Prof. M. Vijayakumar',
        initials: 'MV',
        role: 'Deputy Warden · Boys Hostel 2',
        roleContexts: ['320/330 Beds · 2 Overdue'],
        clusterId: 'hc_boys',
        parentId: 'h_mgr',
        tier: 2,
        status: 'alert',
        statusText: 'Alert · 2 Overdue Outpass Returns',
        scope: 'Boys Hostel 2 (3rd & 4th Year)',
        todaySchedule: ['Action: Contact 2 overdue students', '21:30 Night Curfew Check'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        aggregateSummary: 'Boys Block 2: 97% Occupancy · 2 Overdue Returns',
        deepLinks: [
          { label: 'Open Returns Timeline', route: '/hostel/returns-timeline?block=B2', type: 'primary' },
          { label: 'Curfew Oversight', route: '/deputy-warden/curfew-oversight', type: 'secondary' }
        ]
      },
      {
        id: 'h_ct_b2',
        uuid: 'usr_0194a8b2-ct-b2',
        code: 'CRT-B02',
        name: 'S. Nagaraju',
        initials: 'SN',
        role: 'Resident Caretaker · Boys 2',
        roleContexts: ['3 Open Tickets'],
        clusterId: 'hc_boys',
        parentId: 'h_dw_b2',
        tier: 3,
        status: 'online',
        statusText: 'On Duty · Outpass Gate Desk',
        scope: 'Boys Hostel 2 Ground Desk',
        todaySchedule: ['08:00–20:00 Block Caretaker Shift'],
        weekRoster: ['On', 'Off', 'On', 'On', 'On'],
        aggregateSummary: 'Block 2 Desk: 3 Open Tickets',
        deepLinks: [
          { label: 'Block 2 Rooms', route: '/hostel-manager/rooms?block=B2', type: 'primary' }
        ]
      },
      {
        id: 'h_dw_g1',
        uuid: 'usr_0194a8b2-dw-g1',
        code: 'WRD-G01',
        name: 'Dr. Padmaja Rani',
        initials: 'PR',
        role: 'Deputy Warden · Girls Hostel 1',
        roleContexts: ['280/290 Beds · 1 Overdue'],
        clusterId: 'hc_girls',
        parentId: 'h_mgr',
        tier: 2,
        status: 'leave',
        statusText: '1 Overdue Return (Medical Escort)',
        scope: 'Girls Hostel 1 (1st & 2nd Year)',
        todaySchedule: ['08:00 Morning Roll Call', '18:30 Parent Outpass Verification'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        aggregateSummary: 'Girls Block 1: 96.5% Occupancy · 1 Approved Late Return',
        deepLinks: [
          { label: 'Girls Hostel 1 Oversight', route: '/deputy-warden/curfew-oversight?block=G1', type: 'primary' }
        ]
      },
      {
        id: 'h_ct_g1',
        uuid: 'usr_0194a8b2-ct-g1',
        code: 'CRT-G01',
        name: 'Lakshmi Narayana',
        initials: 'LN',
        role: 'Matron / Caretaker · Girls 1',
        roleContexts: ['2 Open Tickets'],
        clusterId: 'hc_girls',
        parentId: 'h_dw_g1',
        tier: 3,
        status: 'online',
        statusText: 'On Duty · Biometric Kiosk Active',
        scope: 'Girls Hostel 1 Wing',
        todaySchedule: ['07:00–19:00 Matron Duty'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        aggregateSummary: 'Girls Block 1 Desk: Active',
        deepLinks: [
          { label: 'Block G1 Rooms', route: '/hostel-manager/rooms?block=G1', type: 'primary' }
        ]
      },
      {
        id: 'h_dw_g2',
        uuid: 'usr_0194a8b2-dw-g2',
        code: 'WRD-G02',
        name: 'Prof. Shailaja Kumari',
        initials: 'SK',
        role: 'Deputy Warden · Girls Hostel 2',
        roleContexts: ['264/290 Beds · 100% Curfew'],
        clusterId: 'hc_girls',
        parentId: 'h_mgr',
        tier: 2,
        status: 'online',
        statusText: 'All 264 Residents Accounted For',
        scope: 'Girls Hostel 2 (3rd & 4th Year)',
        todaySchedule: ['08:00 Morning Roll Call', '21:00 Night Curfew Check'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        aggregateSummary: 'Girls Block 2: 91.0% Occupancy · 0 Overdue',
        deepLinks: [
          { label: 'Girls Hostel 2 Rooms', route: '/hostel-manager/rooms?block=G2', type: 'primary' }
        ]
      },
      {
        id: 'h_ct_g2',
        uuid: 'usr_0194a8b2-ct-g2',
        code: 'CRT-G02',
        name: 'Anitha Kumari',
        initials: 'AK',
        role: 'Matron / Caretaker · Girls 2',
        roleContexts: ['1 Open Ticket'],
        clusterId: 'hc_girls',
        parentId: 'h_dw_g2',
        tier: 3,
        status: 'online',
        statusText: 'On Duty · 0 Exceptions',
        scope: 'Girls Hostel 2 Wing',
        todaySchedule: ['07:00–19:00 Matron Duty'],
        weekRoster: ['On', 'On', 'Off', 'On', 'On'],
        aggregateSummary: 'Girls Block 2 Desk: Active',
        deepLinks: [
          { label: 'Block G2 Rooms', route: '/hostel-manager/rooms?block=G2', type: 'primary' }
        ]
      },
      {
        id: 'h_mess',
        uuid: 'usr_0194a8b2-mess-01',
        code: 'OPS-MSS-01',
        name: 'Chef Venkatesh Murthy',
        initials: 'VM',
        role: 'Central Mess In-Charge',
        roleContexts: ['1,140 Meal Tokens'],
        clusterId: 'hc_mess',
        parentId: 'h_mgr',
        tier: 2,
        status: 'online',
        statusText: 'Active · Lunch Service Ready (12:15)',
        scope: 'Central Dining Hall & Kitchen',
        todaySchedule: ['07:30 Breakfast Closed (1,090)', '12:15–14:15 Lunch Service'],
        weekRoster: ['On', 'On', 'On', 'On', 'On'],
        aggregateSummary: 'Central Mess: 1,140 Active Meal Subscriptions',
        deepLinks: [
          { label: 'Mess Headcount Sync', route: '/hostel-manager/mess', type: 'primary' }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // AREA 5: EXAM-DAY HALL MAP (Chief Superintendent / OIE / Exam Branch)
  // --------------------------------------------------------------------------
  exam: {
    id: 'exam',
    shortTitle: '5. Exam-Day Hall Map',
    title: 'Exam-Day Hall & Invigilation Map',
    subtitle: 'B.Tech III-I Mid-II Examinations · Hall Invigilator Check-ins, Candidate Reconciliation & Spot Exceptions',
    personaBadge: 'Chief Sup / OIE / Exam Branch',
    icon: 'clipboard',
    coveragePct: 98,
    coverageLabel: 'Candidates Reconciled',
    defaultSelectedId: 'ex_inv_3',
    kpis: [
      { label: 'Invigilators Checked-In', value: '8 / 8', delta: '100% halls manned', tone: 'emerald', sub: 'Reported by 08:30 AM' },
      { label: 'Candidates Reconciled', value: '236 / 240', delta: '98.3% seated', tone: 'indigo', sub: '4 absent marked in OMR' },
      { label: 'Spot Exceptions', value: '2', delta: '1 Hall Ticket · 1 Late', tone: 'rose', sub: 'OIE Triage Desk active' },
      { label: 'Question Paper Seals', value: '4 / 4', delta: 'Verified at 08:45', tone: 'amber', sub: 'Session FN (09:00–12:00)' }
    ],
    clusters: [
      { id: 'ec_cmd', label: 'Exam Control & OIE Desk', hue: 'amber', count: 2 },
      { id: 'ec_h101', label: 'Exam Hall A-101 (60)', hue: 'indigo', count: 2 },
      { id: 'ec_h102', label: 'Exam Hall A-102 (60)', hue: 'violet', count: 2 },
      { id: 'ec_h201', label: 'Exam Hall B-201 (120)', hue: 'emerald', count: 2 }
    ],
    delegations: [],
    nodes: [
      {
        id: 'ex_cs',
        uuid: 'usr_0194a8b2-prin-001',
        code: 'EMP-1001',
        name: 'Dr. R. Subramanian',
        initials: 'RS',
        role: 'Chief Superintendent (Principal Hat)',
        roleContexts: ['role_context: exam_superintendent'],
        clusterId: 'ec_cmd',
        parentId: null,
        tier: 0,
        status: 'online',
        statusText: 'Active · Chief Superintendent Authority',
        scope: 'Autonomous Exam Center #402',
        todaySchedule: ['08:40 Strong Room Seal Release', '12:15 Answer Script Bundling'],
        weekRoster: ['Exam', 'Exam', 'Exam', 'Exam', 'Exam'],
        deepLinks: [
          { label: 'Exam Center Summary', route: '/oie/candidate-attendance', type: 'primary' }
        ]
      },
      {
        id: 'ex_oie',
        uuid: 'usr_0194a8b2-oie-012',
        code: 'EXM-OIE-01',
        name: 'Prof. Raghavendra Joshi',
        initials: 'RJ',
        role: 'Officer In-Charge of Exams (OIE)',
        roleContexts: ['OIE Triage Desk · 2 Exceptions'],
        clusterId: 'ec_cmd',
        parentId: 'ex_cs',
        tier: 1,
        status: 'online',
        statusText: 'Active · Triage Desk Block A',
        scope: 'All Exam Halls & Flying Squad',
        todaySchedule: ['08:30–12:30 FN Session Control', 'Resolving 2 Spot Exceptions'],
        weekRoster: ['Exam', 'Exam', 'Exam', 'Exam', 'Exam'],
        deepLinks: [
          { label: 'Candidate Attendance', route: '/oie/candidate-attendance', type: 'primary' },
          { label: 'Access Exceptions (2)', route: '/oie/access-exceptions', type: 'secondary' }
        ]
      },
      {
        id: 'ex_inv_1',
        uuid: 'usr_0194a8b2-inv-101',
        code: 'FAC-CS-14',
        name: 'Prof. Abhinav Verma',
        initials: 'AV',
        role: 'Senior Invigilator · Hall A-101',
        roleContexts: ['60/60 Reconciled'],
        clusterId: 'ec_h101',
        parentId: 'ex_oie',
        tier: 2,
        status: 'online',
        statusText: 'Checked-in 08:25 · 59 Present, 1 Absent',
        scope: 'Hall A-101 (3rd Yr IT-A)',
        todaySchedule: ['09:00–12:00 Compiler Design Exam'],
        weekRoster: ['Invig', 'Free', 'Invig', 'Free', 'Invig'],
        deepLinks: [
          { label: 'Hall A-101 Sheet', route: '/oie/candidate-attendance?hall=A-101', type: 'primary' }
        ]
      },
      {
        id: 'ex_inv_2',
        uuid: 'usr_0194a8b2-inv-102',
        code: 'FAC-EC-19',
        name: 'Prof. Swathi Reddy',
        initials: 'SR',
        role: 'Co-Invigilator · Hall A-101',
        roleContexts: ['OMR Barcode Verified'],
        clusterId: 'ec_h101',
        parentId: 'ex_oie',
        tier: 2,
        status: 'online',
        statusText: 'Checked-in 08:28 · Zero Exceptions',
        scope: 'Hall A-101',
        todaySchedule: ['09:00–12:00 Invigilation Duty'],
        weekRoster: ['Free', 'Invig', 'Free', 'Invig', 'Invig'],
        deepLinks: [
          { label: 'Hall A-101 Sheet', route: '/oie/candidate-attendance?hall=A-101', type: 'primary' }
        ]
      },
      {
        id: 'ex_inv_3',
        uuid: 'usr_0194a8b2-inv-103',
        code: 'FAC-EE-08',
        name: 'Prof. G. Srinivas',
        initials: 'GS',
        role: 'Senior Invigilator · Hall A-102',
        roleContexts: ['2 Spot Exceptions'],
        clusterId: 'ec_h102',
        parentId: 'ex_oie',
        tier: 2,
        status: 'alert',
        statusText: 'Exception · 1 Duplicate Hall Ticket + 1 Late',
        scope: 'Hall A-102 (3rd Yr CSE-B)',
        todaySchedule: ['09:00–12:00 Operating Systems Exam', 'OIE Provisional Permit Requested'],
        weekRoster: ['Invig', 'Invig', 'Free', 'Free', 'Invig'],
        deepLinks: [
          { label: 'Resolve Access Exceptions', route: '/oie/access-exceptions?hall=A-102', type: 'primary' },
          { label: 'Candidate Roster', route: '/oie/candidate-attendance?hall=A-102', type: 'secondary' }
        ]
      },
      {
        id: 'ex_inv_4',
        uuid: 'usr_0194a8b2-inv-104',
        code: 'FAC-ME-11',
        name: 'Prof. Pallavi Joshi',
        initials: 'PJ',
        role: 'Co-Invigilator · Hall A-102',
        roleContexts: ['58/60 Reconciled'],
        clusterId: 'ec_h102',
        parentId: 'ex_oie',
        tier: 2,
        status: 'online',
        statusText: 'Checked-in 08:22 · Biometric Logged',
        scope: 'Hall A-102',
        todaySchedule: ['09:00–12:00 Invigilation Duty'],
        weekRoster: ['Free', 'Free', 'Invig', 'Invig', 'Invig'],
        deepLinks: [
          { label: 'Hall A-102 Sheet', route: '/oie/candidate-attendance?hall=A-102', type: 'primary' }
        ]
      },
      {
        id: 'ex_inv_5',
        uuid: 'usr_0194a8b2-inv-105',
        code: 'FAC-IT-09',
        name: 'Dr. Rajeshwari Iyer',
        initials: 'RI',
        role: 'Chief Hall Invigilator · B-201',
        roleContexts: ['119/120 Reconciled'],
        clusterId: 'ec_h201',
        parentId: 'ex_oie',
        tier: 2,
        status: 'online',
        statusText: 'Checked-in 08:20 · Seminar Hall B-201',
        scope: 'Hall B-201 (ECE & EEE Combined)',
        todaySchedule: ['09:00–12:00 Signals & Systems Exam'],
        weekRoster: ['Invig', 'Free', 'Invig', 'Free', 'Invig'],
        deepLinks: [
          { label: 'Hall B-201 Sheet', route: '/oie/candidate-attendance?hall=B-201', type: 'primary' }
        ]
      },
      {
        id: 'ex_inv_6',
        uuid: 'usr_0194a8b2-inv-106',
        code: 'FAC-CS-21',
        name: 'Prof. Tarun Chatterjee',
        initials: 'TC',
        role: 'Squad & Relief Invigilator',
        roleContexts: ['Standby Relief'],
        clusterId: 'ec_h201',
        parentId: 'ex_oie',
        tier: 2,
        status: 'online',
        statusText: 'Checked-in 08:30 · Block B Corridor',
        scope: 'Hall B-201 & Relief Pool',
        todaySchedule: ['09:00–12:00 Flying Squad & Relief'],
        weekRoster: ['Free', 'Invig', 'Free', 'Invig', 'Invig'],
        deepLinks: [
          { label: 'Invigilator Roster', route: '/oie/candidate-attendance', type: 'primary' }
        ]
      }
    ]
  }
};

/**
 * ============================================================================
 * MAIN APPLICATION SHELL & REUSABLE <SpatialPeopleMap /> COMPONENT
 * ============================================================================
 */
export default function App() {
  // Active Scoped Area Adapter ('institutional' | 'department' | 'security' | 'hostel' | 'exam')
  const [activeAreaId, setActiveAreaId] = useState('institutional');
  // Dual-Mode Graph View ('constellation' | 'tree')
  const [layoutMode, setLayoutMode] = useState('constellation');
  // Cluster Filter ('all' or cluster.id)
  const [clusterFilter, setClusterFilter] = useState('all');
  // Live Search Input (triggers FLASH_MS = 1600 pulse ring)
  const [searchQuery, setSearchQuery] = useState('');
  // Selected Node ID
  const [selectedNodeId, setSelectedNodeId] = useState('p_vp');
  // Area 2 Special: Zoom into 3rd Year IT-A aggregated class cluster -> individual students
  const [isClassZoomed, setIsClassZoomed] = useState(false);
  // Area 2 Special: Substitute Faculty Assignment state
  const [substituteMap, setSubstituteMap] = useState({});
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  // Area 4 Special: VP Privacy Mode (Aggregate-only PII protection)
  const [vpPrivacyMode, setVpPrivacyMode] = useState(false);
  // SuperAdmin UUID Visibility Toggle
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  // Bidirectional Deep-Link Interactive Drawer / Toast Preview
  const [deepLinkPreview, setDeepLinkPreview] = useState(null);

  const adapter = AREA_ADAPTERS[activeAreaId];

  // Build effective node list (handling Area 2 class zoom & substitute overrides)
  const effectiveNodes = useMemo(() => {
    let base = adapter.nodes.map((n) => {
      if (n.id === 'd_fac_absent' && substituteMap['d_fac_absent']) {
        return {
          ...n,
          substituteAssigned: substituteMap['d_fac_absent'],
          statusText: `On Medical Leave · Covered by ${substituteMap['d_fac_absent']}`,
          roleContexts: [`Sub: ${substituteMap['d_fac_absent']}`]
        };
      }
      return n;
    });

    if (activeAreaId === 'department' && isClassZoomed && adapter.zoomedStudents) {
      base = [...base, ...adapter.zoomedStudents];
    }
    return base;
  }, [adapter, activeAreaId, isClassZoomed, substituteMap]);

  // Switch Area Handler
  const handleSelectArea = (areaKey) => {
    setActiveAreaId(areaKey);
    setClusterFilter('all');
    setSearchQuery('');
    setIsClassZoomed(false);
    setVpPrivacyMode(false);
    setSelectedNodeId(AREA_ADAPTERS[areaKey].defaultSelectedId);
  };

  // Selected Node Object
  const selectedNode = useMemo(() => {
    return effectiveNodes.find((n) => n.id === selectedNodeId) || effectiveNodes[0];
  }, [effectiveNodes, selectedNodeId]);

  // Handle Deep-Link / Action Triggers
  const handleTriggerAction = (link) => {
    if (link.switchArea) {
      handleSelectArea(link.switchArea);
      setDeepLinkPreview({
        title: `Switched Scoped Adapter → ${AREA_ADAPTERS[link.switchArea].title}`,
        route: link.route,
        detail: 'Shared store preserved session context across institutional & operational views.'
      });
      return;
    }
    if (link.type === 'action_zoom') {
      setIsClassZoomed((prev) => !prev);
      setDeepLinkPreview({
        title: !isClassZoomed
          ? 'Expanded 3rd Year IT-A Cluster → 60 Student Nodes (Sampled 6)'
          : 'Collapsed 3rd Year IT-A Back to Aggregate Cluster',
        route: '/faculty/class/3-IT-A?view=spatial',
        detail: 'Aggregate-first rendering keeps SVG smoothstep interpolation locked at 60fps.'
      });
      return;
    }
    if (link.type === 'action_substitute') {
      setIsSubModalOpen(true);
      return;
    }

    setDeepLinkPreview({
      title: `Bidirectional Deep-Link Triggered: ${link.label}`,
      route: link.route,
      detail: `Synced entity [${selectedNode.code}] with Gate Monitor tabular roster & real-time attendance store.`
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F6F7] p-2 sm:p-4 lg:p-6 text-neutral-900 font-sans antialiased selection:bg-neutral-900 selection:text-white">
      <div className="max-w-[1540px] mx-auto bg-white rounded-3xl shadow-sm border border-neutral-200/80 overflow-hidden flex flex-col lg:flex-row min-h-[840px]">
      {/* =================================================================== */}
      {/* ZONE 1: LEFT NAVIGATION RAIL (Unified Reference Sidebar)            */}
      {/* =================================================================== */}
      <aside className="w-full lg:w-64 bg-[#FAFAFB] border-b lg:border-b-0 lg:border-r border-neutral-200/80 p-4 flex flex-col justify-between shrink-0 z-20">
        <div className="overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#111111] text-white flex items-center justify-center shadow-sm">
                <Icon name="shield" className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-neutral-900">Gate Monitor</span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200/80">
                    v4.2
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500 font-mono">&lt;SpatialPeopleMap /&gt;</p>
              </div>
            </div>
          </div>

          {/* 5 Scoped Area Adapters Switcher */}
          <div className="pb-3 border-b border-neutral-200/70">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-medium text-neutral-400">
                Scoped Adapters
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-200/70 text-neutral-600">28 Roles</span>
            </div>
            <div className="space-y-1">
              {Object.values(AREA_ADAPTERS).map((area) => {
                const isActive = area.id === activeAreaId;
                return (
                  <button
                    key={area.id}
                    onClick={() => handleSelectArea(area.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/80 font-semibold'
                        : 'text-neutral-600 hover:bg-neutral-200/50 font-medium'
                    }`}
                  >
                    <div
                      className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                        isActive ? 'bg-[#111111] text-white' : 'bg-neutral-200/60 text-neutral-500'
                      }`}
                    >
                      <Icon name={area.icon} className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate">{area.shortTitle}</div>
                      <div
                        className={`text-[10px] truncate mt-0.5 ${
                          isActive ? 'text-neutral-500' : 'text-neutral-400'
                        }`}
                      >
                        {area.personaBadge}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scoped Operational Unit Filter Tree */}
          <div className="p-3">
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Operational Clusters
              </span>
              {clusterFilter !== 'all' && (
                <button
                  onClick={() => setClusterFilter('all')}
                  className="text-[10px] font-semibold text-indigo-600 hover:underline"
                >
                  Show all
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              {adapter.clusters.map((cluster) => {
                const hue = HUES[cluster.hue] || HUES.navy;
                const isSelected = clusterFilter === cluster.id;
                const count = effectiveNodes.filter((n) => n.clusterId === cluster.id).length;

                return (
                  <button
                    key={cluster.id}
                    onClick={() => setClusterFilter(isSelected ? 'all' : cluster.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? 'bg-slate-100 font-semibold text-slate-900'
                        : 'font-medium text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: hue.hex }}
                      />
                      <span className="truncate">{cluster.label}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Semantic Hue Legend */}
            <div className="mt-4 pt-3 border-t border-slate-100 px-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Semantic Hue System
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600">
                {Object.entries(HUES)
                  .filter(([k]) => k !== 'rose')
                  .map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: val.hex }}
                      />
                      <span className="truncate">{val.label}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Governance Controls: Coverage Bar + SuperAdmin UUID Toggle */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 space-y-2.5">
          {/* Operational Coverage Progress */}
          <div className="bg-white p-2.5 rounded-2xl border border-neutral-200/80">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold text-slate-700">{adapter.coverageLabel}</span>
              <span className="font-mono font-bold text-emerald-600">{adapter.coveragePct}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${adapter.coveragePct}%` }}
              />
            </div>
          </div>

          {/* SuperAdmin PII / Internal UUID Visibility Toggle */}
          <label className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white border border-neutral-200/80 cursor-pointer hover:border-slate-300 transition-colors">
            <div>
              <div className="text-[11px] font-semibold text-slate-800">isSuperAdmin(role)</div>
              <div className="text-[10px] text-slate-400">Reveal internal UUIDs</div>
            </div>
            <input
              type="checkbox"
              checked={isSuperAdmin}
              onChange={(e) => setIsSuperAdmin(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* MAIN WORKSPACE: MACRO KPI STRIP + MESO MAP + MICRO INSPECTOR        */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 lg:overflow-hidden">
        {/* Top Context & Role Bar */}
        <header className="bg-white border-b border-neutral-200/80 px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base lg:text-lg font-bold tracking-tight text-slate-900">
                {adapter.title}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Scope: {adapter.personaBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{adapter.subtitle}</p>
          </div>

          {/* Area-Specific Quick Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Area 2 Special: Zoom into Class Section Toggle */}
            {activeAreaId === 'department' && (
              <button
                onClick={() => {
                  setIsClassZoomed((prev) => !prev);
                  if (!isClassZoomed) setSelectedNodeId('d_cls_3ita');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isClassZoomed
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Icon name="zoomIn" className="w-3.5 h-3.5" />
                {isClassZoomed ? 'Collapse Class Section' : 'Zoom into 3rd Yr IT-A (60)'}
              </button>
            )}

            {/* Area 4 Special: VP Privacy Mode Toggle */}
            {activeAreaId === 'hostel' && (
              <button
                onClick={() => setVpPrivacyMode((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  vpPrivacyMode
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Icon name="eyeOff" className="w-3.5 h-3.5" />
                {vpPrivacyMode ? 'VP Privacy Mode: ON (Aggregate Only)' : 'Simulate VP Boundary'}
              </button>
            )}

            {/* Deep-Link Status Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600">
              <span>/api/org-map?area={activeAreaId}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Inner Workspace */}
        <main className="flex-1 p-4 lg:p-5 flex flex-col gap-4 lg:overflow-hidden">
          {/* =============================================================== */}
          {/* ZONE 2: MACRO — TOP KPI SUMMARY STRIP                           */}
          {/* =============================================================== */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 shrink-0">
            {adapter.kpis.map((kpi, idx) => {
              const badgeStyles = {
                emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
                amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
                indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
                rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
                navy: 'bg-neutral-100 text-neutral-700 border-neutral-200/80'
              }[kpi.tone];
              const barFill = {
                emerald: 'bg-emerald-600',
                amber: 'bg-amber-500',
                indigo: 'bg-indigo-600',
                rose: 'bg-rose-600',
                navy: 'bg-neutral-800'
              }[kpi.tone] || 'bg-neutral-800';
              const activeSegments = kpi.tone === 'rose' ? 2 : kpi.tone === 'amber' ? 3 : 4;

              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-neutral-500 truncate">{kpi.label}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badgeStyles}`}
                    >
                      {kpi.delta}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 mt-2 mb-3">
                    <span className="text-xl lg:text-2xl font-bold tracking-tight text-neutral-900">
                      {kpi.value}
                    </span>
                    <span className="text-[11px] text-neutral-400 truncate">{kpi.sub}</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 rounded-md overflow-hidden flex gap-[2px] p-0.5">
                    {[0, 1, 2, 3].map((seg) => (
                      <span
                        key={seg}
                        className={`flex-1 rounded-sm ${seg < activeSegments ? barFill : 'bg-neutral-200/80'}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* =============================================================== */}
          {/* LOWER SPLIT: MESO (SPATIAL CANVAS) + MICRO (RIGHT INSPECTOR)    */}
          {/* =============================================================== */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-[540px] lg:min-h-0 lg:overflow-hidden">
            {/* MESO: REUSABLE <SpatialPeopleMap /> ENGINE */}
            <SpatialPeopleMap
              adapter={adapter}
              nodes={effectiveNodes}
              layoutMode={layoutMode}
              setLayoutMode={setLayoutMode}
              clusterFilter={clusterFilter}
              setClusterFilter={setClusterFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
              vpPrivacyMode={vpPrivacyMode}
              isClassZoomed={isClassZoomed}
            />

            {/* MICRO: RIGHT CONTEXTUAL INSPECTOR */}
            <aside className="w-full lg:w-[340px] flex flex-col gap-3.5 shrink-0 lg:overflow-y-auto">
              {/* Inspector Card 1: Entity Identity & Live Status */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm">
                {vpPrivacyMode && activeAreaId === 'hostel' && selectedNode.tier >= 2 ? (
                  /* Strict VP PII Protection Boundary View */
                  <div className="py-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                      <Icon name="eyeOff" className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      VP Privacy Boundary Active
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Individual warden/caretaker & resident PII is masked for{' '}
                      <code className="font-mono text-slate-700">vice_principal</code> role. Showing
                      aggregate block KPI only:
                    </p>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                      {selectedNode.aggregateSummary || 'Aggregate Hostel Block Metrics Only'}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header Identity Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ring-2 ring-offset-2"
                          style={{
                            backgroundColor: getClusterHue(adapter, selectedNode.clusterId).hex,
                            '--tw-ring-color': getClusterHue(adapter, selectedNode.clusterId).hex
                          }}
                        >
                          {selectedNode.initials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {selectedNode.name}
                          </h3>
                          <p className="text-xs text-slate-500 truncate">{selectedNode.role}</p>
                        </div>
                      </div>
                      <StatusBadge status={selectedNode.status} />
                    </div>

                    {/* Dual-Hat role_context & Scope Badges */}
                    {selectedNode.roleContexts && selectedNode.roleContexts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {selectedNode.roleContexts.map((ctx, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                          >
                            <Icon name="sparkles" className="w-2.5 h-2.5" />
                            {ctx}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Human Identifiers Grid (Never raw UUID unless isSuperAdmin is true) */}
                    <div className="grid grid-cols-2 gap-2.5 mt-3.5 pt-3.5 border-t border-slate-100 text-xs">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Employee / Roll Code
                        </div>
                        <div className="font-mono font-semibold text-slate-800 mt-0.5">
                          {selectedNode.code}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Operational Scope
                        </div>
                        <div className="font-medium text-slate-700 mt-0.5 truncate" title={selectedNode.scope}>
                          {selectedNode.scope}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Live Presence Signal
                        </div>
                        <div className="font-medium text-slate-800 mt-0.5">
                          {selectedNode.statusText}
                        </div>
                      </div>

                      {/* Conditional SuperAdmin UUID Row */}
                      {isSuperAdmin && (
                        <div className="col-span-2 p-2 rounded-lg bg-slate-900 text-slate-200 font-mono text-[10px] flex items-center justify-between">
                          <span className="text-slate-400">internal_uuid:</span>
                          <span>{selectedNode.uuid}</span>
                        </div>
                      )}
                    </div>

                    {/* Today's Shift / Class Slots */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Today&apos;s Roster / Duty Slots
                      </div>
                      <div className="space-y-1.5">
                        {selectedNode.todaySchedule.map((slot, idx) => (
                          <div
                            key={idx}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-medium text-slate-700 flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span className="truncate">{slot}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mon–Fri Weekly Roster Strip */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Mon – Fri Roster Strip
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Week 48</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, idx) => {
                          const val = selectedNode.weekRoster[idx] || 'On';
                          const isAlert = ['Leave', 'A', 'Handover', 'Pass'].includes(val);
                          return (
                            <div
                              key={day}
                              className={`p-1.5 rounded-lg border text-center ${
                                idx === 4
                                  ? 'border-indigo-300 bg-indigo-50/40'
                                  : 'border-slate-100 bg-slate-50/70'
                              }`}
                            >
                              <div className="text-[10px] font-semibold text-slate-500">{day}</div>
                              <div
                                className={`mt-1 text-[10px] font-mono font-bold px-1 py-0.5 rounded ${
                                  isAlert
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100/80 text-emerald-800'
                                }`}
                              >
                                {val}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bidirectional Deep-Link Action Buttons */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Bidirectional Roster & Chat Links
                      </div>
                      {selectedNode.deepLinks.map((link, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleTriggerAction(link)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            idx === 0
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span className="truncate">{link.label}</span>
                          <Icon name="external" className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Inspector Card 2: Escalation Lineage Chain */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-3.5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Active Escalation & Approval Path
                </div>
                <div className="space-y-1.5">
                  {getLineageList(effectiveNodes, selectedNode.id).map((ancestor, idx, arr) => {
                    const hue = getClusterHue(adapter, ancestor.clusterId);
                    const isLast = idx === arr.length - 1;
                    return (
                      <button
                        key={ancestor.id}
                        onClick={() => setSelectedNodeId(ancestor.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                          isLast
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: hue.hex }}
                          />
                          <span className="truncate">
                            {vpPrivacyMode && activeAreaId === 'hostel' && ancestor.tier >= 2
                              ? `Aggregate Unit (${ancestor.code})`
                              : ancestor.name}
                          </span>
                        </span>
                        <span
                          className={`text-[10px] font-mono shrink-0 ${
                            isLast ? 'text-indigo-300' : 'text-slate-400'
                          }`}
                        >
                          T{ancestor.tier}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* =================================================================== */}
      {/* MODAL: FLEXIBLE-CLASS SUBSTITUTE PICKER (Area 2 Integration)        */}
      {/* =================================================================== */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Flexible-Class Substitute Picker
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Slot: 10:00–11:00 Compiler Design (3rd Year IT-A)
                </p>
              </div>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-500">
                Available IT Faculty in Period 2 (10:00 AM):
              </div>
              {[
                { name: 'Dr. Mohammed Irfan', code: 'FAC-IT-22', note: 'Free Slot · Cloud Lab Lead' },
                { name: 'Prof. Karthik Subramanian', code: 'FAC-IT-14', note: 'Class Advisor · 3rd Yr IT-A' }
              ].map((cand) => (
                <button
                  key={cand.code}
                  onClick={() => {
                    setSubstituteMap((prev) => ({ ...prev, d_fac_absent: cand.name }));
                    setIsSubModalOpen(false);
                    setDeepLinkPreview({
                      title: `Substitute Assigned: ${cand.name}`,
                      route: '/hod/schedule?updated=3-IT-A',
                      detail:
                        'Updated HOD timetable, notified 3rd Year IT-A /chat, and cleared coverage gap.'
                    });
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{cand.name}</div>
                    <div className="text-[11px] text-slate-500">{cand.note}</div>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600">Assign →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* BIDIRECTIONAL DEEP-LINK ROUTE PREVIEW TOAST                         */}
      {/* =================================================================== */}
      {deepLinkPreview && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-700/80 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="swap" className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white truncate">{deepLinkPreview.title}</span>
              <button
                onClick={() => setDeepLinkPreview(null)}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="x" className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-1 inline-block px-2 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-emerald-400">
              {deepLinkPreview.route}
            </div>
            <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
              {deepLinkPreview.detail}
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * REUSABLE <SpatialPeopleMap /> COMPONENT
 * Handles:
 *  - Polar Constellation vs Top-Down Org Chart layout coordinates
 *  - 60fps requestAnimationFrame Cubic Hermite Smoothstep Interpolation
 *  - Focus + Context Dimming (opacity: 0.22 on non-lineage nodes)
 *  - Dashed Delegation Arcs & Search Pulse Rings (FLASH_MS = 1600)
 * ============================================================================
 */
export function SpatialPeopleMap({
  adapter,
  nodes,
  layoutMode,
  setLayoutMode,
  clusterFilter,
  setClusterFilter,
  searchQuery,
  setSearchQuery,
  selectedNodeId,
  setSelectedNodeId,
  vpPrivacyMode,
  isClassZoomed
}) {
  const SVG_W = 920;
  const SVG_H = 600;

  // Interpolated positions state { [nodeId]: { x, y } }
  const [positions, setPositions] = useState({});
  const posRef = useRef({});
  const animRef = useRef(null);

  // Camera Pan & Zoom state
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0 });

  // Reset camera when switching area
  useEffect(() => {
    setCamera({ x: 0, y: 0, scale: 1 });
  }, [adapter.id]);

  // Compute Target Coordinates for Constellation (Polar) or Org Chart (Tree)
  const targetPositions = useMemo(() => {
    const targets = {};
    const cx = SVG_W / 2;
    const cy = SVG_H / 2 + 10;

    const rootNode = nodes.find((n) => n.parentId === null) || nodes[0];
    const activeClusters =
      clusterFilter === 'all'
        ? adapter.clusters
        : adapter.clusters.filter((c) => c.id === clusterFilter);

    if (layoutMode === 'constellation') {
      // POLAR RADIAL CONSTELLATION LAYOUT
      if (rootNode) {
        targets[rootNode.id] = { x: cx, y: cy };
      }

      const nonRootClusters = activeClusters.filter((c) =>
        nodes.some((n) => n.clusterId === c.id && n.id !== rootNode?.id)
      );
      const step = (Math.PI * 2) / Math.max(nonRootClusters.length, 1);

      nonRootClusters.forEach((cluster, cIdx) => {
        const baseAngle = -Math.PI * 0.72 + cIdx * step;
        const clusterNodes = nodes.filter(
          (n) => n.clusterId === cluster.id && n.id !== rootNode?.id
        );

        const tier1Nodes = clusterNodes.filter((n) => n.tier === 1);
        const deeperNodes = clusterNodes.filter((n) => n.tier >= 2);

        const r1 = clusterFilter === 'all' ? 128 : 95;
        const r2 = clusterFilter === 'all' ? 225 : 195;

        tier1Nodes.forEach((node, idx) => {
          const spread = tier1Nodes.length > 1 ? 0.34 : 0;
          const ang =
            baseAngle +
            (tier1Nodes.length === 1 ? 0 : (idx / (tier1Nodes.length - 1) - 0.5) * spread);
          targets[node.id] = {
            x: cx + Math.cos(ang) * r1,
            y: cy + Math.sin(ang) * r1
          };
        });

        deeperNodes.forEach((node, idx) => {
          const maxFan = clusterFilter === 'all' ? Math.min(step * 0.82, 0.88) : Math.PI * 1.1;
          const ang =
            baseAngle +
            (deeperNodes.length === 1 ? 0 : (idx / (deeperNodes.length - 1) - 0.5) * maxFan);
          const tierExtra = node.tier >= 3 ? 52 : (idx % 2) * 18;
          targets[node.id] = {
            x: cx + Math.cos(ang) * (r2 + tierExtra),
            y: cy + Math.sin(ang) * (r2 + tierExtra)
          };
        });
      });

      // Tuck filtered-out nodes near center
      nodes.forEach((n) => {
        if (!targets[n.id]) targets[n.id] = { x: cx, y: cy };
      });
    } else {
      // HIERARCHICAL TOP-DOWN ORG CHART LAYOUT
      const tierY = { 0: 76, 1: 215, 2: 365, 3: 505 };
      const visibleNodes = nodes.filter(
        (n) => clusterFilter === 'all' || n.parentId === null || n.clusterId === clusterFilter
      );

      [0, 1, 2, 3].forEach((tier) => {
        const rowNodes = visibleNodes.filter((n) => n.tier === tier);
        const count = rowNodes.length;
        if (count === 0) return;

        const padX = count === 1 ? SVG_W / 2 : 84;
        const usableW = SVG_W - padX * 2;

        rowNodes.forEach((node, idx) => {
          const x = count === 1 ? SVG_W / 2 : padX + (idx / (count - 1)) * usableW;
          const staggerY = count >= 7 && idx % 2 === 1 ? 34 : 0;
          targets[node.id] = {
            x,
            y: (tierY[tier] || 365) + staggerY
          };
        });
      });

      nodes.forEach((n) => {
        if (!targets[n.id]) targets[n.id] = { x: cx, y: 215 };
      });
    }

    return targets;
  }, [nodes, adapter.clusters, layoutMode, clusterFilter]);

  // Smoothstep Interpolation Effect (60fps requestAnimationFrame)
  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const cx = SVG_W / 2;
    const cy = SVG_H / 2 + 10;

    const startMap = {};
    nodes.forEach((n) => {
      startMap[n.id] = posRef.current[n.id] || { x: cx, y: cy };
    });

    const duration = Object.keys(posRef.current).length === 0 ? INTRO_MS : MORPH_MS;
    const t0 = performance.now();

    const step = (now) => {
      const elapsed = now - t0;
      const k = smoothstep(0, duration, elapsed);
      const next = {};

      nodes.forEach((n) => {
        const s = startMap[n.id] || { x: cx, y: cy };
        const e = targetPositions[n.id] || { x: cx, y: cy };
        next[n.id] = {
          x: s.x + (e.x - s.x) * k,
          y: s.y + (e.y - s.y) * k
        };
      });

      posRef.current = next;
      setPositions(next);

      if (elapsed < duration) {
        animRef.current = requestAnimationFrame(step);
      }
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetPositions, nodes]);

  // Lineage Set for Focus + Context Dimming (opacity: 0.22 on non-lineage nodes)
  const lineageSet = useMemo(() => {
    const set = new Set([selectedNodeId]);
    let curr = nodes.find((n) => n.id === selectedNodeId);
    while (curr && curr.parentId) {
      set.add(curr.parentId);
      curr = nodes.find((n) => n.id === curr.parentId);
    }
    nodes.forEach((n) => {
      if (n.parentId === selectedNodeId) set.add(n.id);
    });
    return set;
  }, [nodes, selectedNodeId]);

  const searchLower = searchQuery.trim().toLowerCase();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const isNodeVisible = useCallback(
    (node) => {
      if (clusterFilter === 'all') return true;
      return node.parentId === null || node.clusterId === clusterFilter;
    },
    [clusterFilter]
  );

  return (
    <section className="flex-1 bg-white rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col min-h-[480px] lg:min-h-0 overflow-hidden relative">
      {/* Toolbar Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-white z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Spatial Governance Canvas</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              {layoutMode === 'constellation' ? 'Polar Clusters' : 'Escalation Tree'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Click node to illuminate escalation path · Drag canvas to pan
          </p>
        </div>

        {/* Search Input + Constellation <-> Org Chart Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Search Input (triggers FLASH_MS = 1600 pulse ring) */}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.trim().length >= 2) {
                  const q = val.trim().toLowerCase();
                  const hit = nodes.find(
                    (n) =>
                      isNodeVisible(n) &&
                      (n.name.toLowerCase().includes(q) || n.code.toLowerCase().includes(q))
                  );
                  if (hit) setSelectedNodeId(hit.id);
                }
              }}
              placeholder="Find person or roll/emp code..."
              className="pl-8 pr-7 py-1.5 w-48 sm:w-56 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <Icon name="x" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dual-Mode Segmented Toggle */}
          <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/80">
            <button
              onClick={() => setLayoutMode('constellation')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                layoutMode === 'constellation'
                  ? 'bg-white text-slate-900 font-semibold shadow-sm'
                  : 'text-slate-600 font-medium hover:text-slate-900'
              }`}
            >
              <Icon
                name="orbit"
                className={`w-3.5 h-3.5 ${
                  layoutMode === 'constellation' ? 'text-indigo-600' : 'text-slate-500'
                }`}
              />
              Constellation
            </button>
            <button
              onClick={() => setLayoutMode('tree')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                layoutMode === 'tree'
                  ? 'bg-white text-slate-900 font-semibold shadow-sm'
                  : 'text-slate-600 font-medium hover:text-slate-900'
              }`}
            >
              <Icon
                name="tree"
                className={`w-3.5 h-3.5 ${
                  layoutMode === 'tree' ? 'text-indigo-600' : 'text-slate-500'
                }`}
              />
              Org chart
            </button>
          </div>
        </div>
      </div>

      {/* Cluster Filter Pills Bar */}
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center gap-1.5 overflow-x-auto shrink-0 z-10">
        <button
          onClick={() => setClusterFilter('all')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 ${
            clusterFilter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>All Clusters</span>
          <span className="opacity-75 font-mono">{nodes.length}</span>
        </button>

        {adapter.clusters.map((cluster) => {
          const hue = HUES[cluster.hue] || HUES.navy;
          const isActive = clusterFilter === cluster.id;
          const cnt = nodes.filter((n) => n.clusterId === cluster.id).length;

          return (
            <button
              key={cluster.id}
              onClick={() => setClusterFilter(isActive ? 'all' : cluster.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white font-semibold shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 font-medium hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hue.hex }} />
              <span>{cluster.label}</span>
              <span className="text-[10px] opacity-70 font-mono">{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive SVG Canvas Viewport */}
      <div
        onMouseDown={(e) => {
          if (e.target.closest('.spatial-node')) return;
          dragRef.current = {
            active: true,
            startX: e.clientX - camera.x,
            startY: e.clientY - camera.y
          };
        }}
        onMouseMove={(e) => {
          if (!dragRef.current.active) return;
          setCamera((prev) => ({
            ...prev,
            x: e.clientX - dragRef.current.startX,
            y: e.clientY - dragRef.current.startY
          }));
        }}
        onMouseUp={() => {
          dragRef.current.active = false;
        }}
        onMouseLeave={() => {
          dragRef.current.active = false;
        }}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{
          backgroundColor: '#FFFFFF',
          backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        <style>{`
          @keyframes flashPulseRing {
            0% { transform: scale(0.95); opacity: 0.95; }
            75% { transform: scale(1.95); opacity: 0; }
            100% { transform: scale(1.95); opacity: 0; }
          }
          @keyframes dashFlow {
            to { stroke-dashoffset: -24; }
          }
          .pulse-flash-ring {
            transform-box: fill-box;
            transform-origin: center;
            animation: flashPulseRing ${FLASH_MS}ms cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }
          .delegation-arc {
            animation: dashFlow 1.4s linear infinite;
          }
        `}</style>

        <svg className="w-full h-full block" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="cardShadow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.10" />
            </filter>
            <filter id="tooltipShadow" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.24" />
            </filter>
            <marker id="arrowHead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#4F46E5" />
            </marker>
          </defs>

          <g
            transform={`translate(${SVG_W / 2 + camera.x}, ${SVG_H / 2 + camera.y}) scale(${
              camera.scale
            }) translate(${-SVG_W / 2}, ${-SVG_H / 2})`}
          >
            {/* Layer 1: Background Orbital Rings or Tier Guidelines */}
            {layoutMode === 'constellation' ? (
              <g>
                <circle
                  cx={SVG_W / 2}
                  cy={SVG_H / 2 + 10}
                  r="128"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <circle
                  cx={SVG_W / 2}
                  cy={SVG_H / 2 + 10}
                  r="228"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              </g>
            ) : (
              <g>
                {[
                  { y: 76, tag: 'TIER 0 · EXEC' },
                  { y: 215, tag: 'TIER 1 · LEADS' },
                  { y: 365, tag: 'TIER 2 · OPS / CLASSES' },
                  ...(isClassZoomed || adapter.id === 'hostel'
                    ? [{ y: 505, tag: 'TIER 3 · GROUND / STUDENTS' }]
                    : [])
                ].map((row) => (
                  <g key={row.y}>
                    <line
                      x1="44"
                      y1={row.y}
                      x2={SVG_W - 44}
                      y2={row.y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <text
                      x="18"
                      y={row.y + 3}
                      fontSize="8.5"
                      fontFamily="JetBrains Mono, monospace"
                      fill="#94A3B8"
                    >
                      {row.tag}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Layer 2: Reporting & Escalation Links */}
            <g>
              {nodes.map((node) => {
                if (!node.parentId || !isNodeVisible(node)) return null;
                const p1 = positions[node.parentId];
                const p2 = positions[node.id];
                if (!p1 || !p2) return null;

                const isLineage = lineageSet.has(node.id) && lineageSet.has(node.parentId);
                const hue = getClusterHue(adapter, node.clusterId);

                let d = '';
                if (layoutMode === 'tree') {
                  const midY = (p1.y + p2.y) / 2;
                  d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C ${p1.x.toFixed(1)} ${midY.toFixed(
                    1
                  )}, ${p2.x.toFixed(1)} ${midY.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
                } else {
                  const cx = SVG_W / 2;
                  const cy = SVG_H / 2 + 10;
                  const ctrlX = (p1.x + p2.x) * 0.46 + cx * 0.08;
                  const ctrlY = (p1.y + p2.y) * 0.46 + cy * 0.08;
                  d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(
                    1
                  )}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
                }

                return (
                  <path
                    key={`link-${node.id}`}
                    d={d}
                    fill="none"
                    stroke={isLineage ? hue.hex : '#CBD5E1'}
                    strokeWidth={isLineage ? 2.5 : 1.3}
                    strokeOpacity={isLineage ? 0.95 : 0.28}
                  />
                );
              })}
            </g>

            {/* Layer 2B: Dashed Delegation Arcs (e.g. Principal -> VP with expiry countdown) */}
            <g>
              {(adapter.delegations || []).map((del, idx) => {
                const p1 = positions[del.fromId];
                const p2 = positions[del.toId];
                if (!p1 || !p2) return null;

                const midX = (p1.x + p2.x) / 2 - 44;
                const midY = (p1.y + p2.y) / 2 - 36;
                const d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(
                  1
                )}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;

                return (
                  <g key={`del-${idx}`}>
                    <path
                      d={d}
                      fill="none"
                      stroke="#4F46E5"
                      strokeWidth="2.2"
                      strokeDasharray="6 4"
                      markerEnd="url(#arrowHead)"
                      className="delegation-arc"
                    />
                    <g transform={`translate(${(midX - 68).toFixed(1)}, ${(midY - 14).toFixed(1)})`}>
                      <rect
                        width="148"
                        height="20"
                        rx="6"
                        fill="#EEF2FF"
                        stroke="#818CF8"
                        strokeWidth="1"
                      />
                      <text
                        x="74"
                        y="13"
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                        fill="#3730A3"
                      >
                        {del.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>

            {/* Layer 3: Persistent Entity Nodes (Focus + Context opacity: 0.22) */}
            <g>
              {nodes.map((node) => {
                if (!isNodeVisible(node)) return null;
                const pos = positions[node.id];
                if (!pos) return null;

                const isSelected = node.id === selectedNodeId;
                const isInLineage = lineageSet.has(node.id);
                const hue = getClusterHue(adapter, node.clusterId);

                const isRoot = node.tier === 0;
                const isAggClass = Boolean(node.isAggregatedClass);
                const radius = isRoot ? 24 : isAggClass ? 21 : node.tier === 1 ? 19 : 16;

                const isSearchHit =
                  searchLower.length > 0 &&
                  (node.name.toLowerCase().includes(searchLower) ||
                    node.code.toLowerCase().includes(searchLower) ||
                    node.role.toLowerCase().includes(searchLower));

                // Focus + Context Lighting: Dim non-lineage nodes to 0.22 when a node is selected
                const nodeOpacity =
                  searchLower.length > 0
                    ? isSearchHit || isSelected
                      ? 1
                      : 0.22
                    : isInLineage
                    ? 1
                    : 0.22;

                const statusDotColor =
                  node.status === 'online'
                    ? '#10B981'
                    : node.status === 'alert'
                    ? '#E11D48'
                    : '#F59E0B';

                const displayLabel =
                  vpPrivacyMode && adapter.id === 'hostel' && node.tier >= 2
                    ? node.code
                    : isAggClass
                    ? node.code
                    : node.name.split(' ')[0];

                return (
                  <g
                    key={node.id}
                    className="spatial-node cursor-pointer"
                    opacity={nodeOpacity}
                    transform={`translate(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`}
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    {/* Search Pulse Ring (FLASH_MS = 1600) */}
                    {isSearchHit && (
                      <circle
                        r={radius + 7}
                        fill="none"
                        stroke={hue.hex}
                        strokeWidth="2.5"
                        className="pulse-flash-ring"
                      />
                    )}

                    {/* Selected Halo */}
                    {isSelected && (
                      <circle
                        r={radius + 6}
                        fill={hue.hex}
                        fillOpacity="0.15"
                        stroke={hue.hex}
                        strokeWidth="2"
                      />
                    )}

                    {/* Node Body (Rounded Square for Aggregated Class Clusters, Circle for People) */}
                    {isAggClass ? (
                      <rect
                        x={-radius}
                        y={-radius + 3}
                        width={radius * 2}
                        height={(radius - 3) * 2}
                        rx="10"
                        fill="#FFFFFF"
                        stroke={isSelected ? hue.hex : '#94A3B8'}
                        strokeWidth={isSelected ? 2.8 : 2}
                        filter="url(#cardShadow)"
                      />
                    ) : (
                      <circle
                        r={radius}
                        fill={isRoot ? '#0F172A' : '#FFFFFF'}
                        stroke={isSelected || isInLineage ? hue.hex : '#CBD5E1'}
                        strokeWidth={isSelected ? 3 : 2.2}
                        filter="url(#cardShadow)"
                      />
                    )}

                    {/* Tinted Inner Fill */}
                    {!isRoot && !isAggClass && (
                      <circle r={radius - 3.5} fill={hue.hex} fillOpacity="0.12" />
                    )}

                    {/* Initials / Cluster Code */}
                    <text
                      y="1"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={isRoot ? '11' : '9.5'}
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                      fill={isRoot ? '#FFFFFF' : hue.hex}
                    >
                      {node.initials}
                    </text>

                    {/* Live Presence Status Dot */}
                    <circle
                      cx={(radius * 0.72).toFixed(1)}
                      cy={(radius * 0.72).toFixed(1)}
                      r="4"
                      fill={statusDotColor}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />

                    {/* Node Caption */}
                    <text
                      y={radius + 13}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight={isSelected ? '700' : '500'}
                      fill={isSelected ? '#0F172A' : '#475569'}
                    >
                      {displayLabel}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Layer 4: Floating Dark Tooltip Badge on Selected Node */}
            {selectedNode && isNodeVisible(selectedNode) && positions[selectedNode.id] && (
              <g
                transform={`translate(${Math.max(
                  14,
                  Math.min(SVG_W - 196, positions[selectedNode.id].x - 91)
                ).toFixed(1)}, ${(positions[selectedNode.id].y < 105
                  ? positions[selectedNode.id].y + 32
                  : positions[selectedNode.id].y - 74
                ).toFixed(1)})`}
                filter="url(#tooltipShadow)"
                pointerEvents="none"
              >
                <rect width="182" height="46" rx="10" fill="#0F172A" />
                <circle
                  cx="14"
                  cy="16"
                  r="4"
                  fill={getClusterHue(adapter, selectedNode.clusterId).hex}
                />
                <text x="24" y="19" fontSize="11" fontWeight="700" fill="#FFFFFF">
                  {vpPrivacyMode && adapter.id === 'hostel' && selectedNode.tier >= 2
                    ? `Masked Unit (${selectedNode.code})`
                    : selectedNode.name.slice(0, 22)}
                </text>
                <text x="14" y="34" fontSize="9.5" fill="#94A3B8">
                  {selectedNode.role.slice(0, 29)}
                </text>
              </g>
            )}
          </g>
        </svg>

        {/* Bottom-Left Telemetry & Focus Legend */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm flex items-center gap-3 text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> On-Duty / Present
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Leave / Pass
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600" /> Alert / Exception
            </span>
          </div>
        </div>

        {/* Bottom-Right Zoom & Fit Controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-1 shadow-sm">
          <button
            onClick={() =>
              setCamera((c) => ({ ...c, scale: Math.max(0.65, +(c.scale - 0.15).toFixed(2)) }))
            }
            className="px-2 py-1 rounded hover:bg-slate-100 text-xs font-bold text-slate-600"
          >
            −
          </button>
          <span className="px-1.5 text-[11px] font-mono text-slate-600 min-w-[42px] text-center">
            {Math.round(camera.scale * 100)}%
          </span>
          <button
            onClick={() =>
              setCamera((c) => ({ ...c, scale: Math.min(1.85, +(c.scale + 0.15).toFixed(2)) }))
            }
            className="px-2 py-1 rounded hover:bg-slate-100 text-xs font-bold text-slate-600"
          >
            +
          </button>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <button
            onClick={() => setCamera({ x: 0, y: 0, scale: 1 })}
            className="px-2 py-1 rounded hover:bg-slate-100 text-[11px] font-semibold text-slate-700"
          >
            Fit
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Helper Components & Pure Functions
 */
function StatusBadge({ status }) {
  if (status === 'online') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }
  if (status === 'alert') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
        Alert
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Leave / Delegated
    </span>
  );
}

function getClusterHue(adapter, clusterId) {
  const cluster = adapter.clusters.find((c) => c.id === clusterId);
  return HUES[cluster?.hue] || HUES.navy;
}

function getLineageList(nodes, targetId) {
  const chain = [];
  let curr = nodes.find((n) => n.id === targetId);
  const guard = new Set();
  while (curr && !guard.has(curr.id)) {
    guard.add(curr.id);
    chain.unshift(curr);
    curr = nodes.find((n) => n.id === curr.parentId);
  }
  return chain;
}