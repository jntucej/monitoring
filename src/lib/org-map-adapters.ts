export type AreaId = 'institutional' | 'department' | 'security' | 'hostel' | 'exam';
export type HueKey = 'indigo' | 'violet' | 'emerald' | 'amber' | 'navy' | 'rose';
export type KpiTone = 'emerald' | 'amber' | 'indigo' | 'rose' | 'navy';
export type NodeStatus = 'online' | 'delegated' | 'alert' | 'leave' | 'offline';

export interface SpatialKpi {
  label: string;
  value: string;
  delta: string;
  tone: KpiTone;
  sub: string;
}

export interface SpatialCluster {
  id: string;
  label: string;
  hue: HueKey;
  count: number;
}

export interface SpatialDelegation {
  fromId: string;
  toId: string;
  label: string;
  reason?: string;
}

export interface SpatialDeepLink {
  label: string;
  route: string;
  type: string;
  switchArea?: AreaId;
}

export interface SpatialNode {
  id: string;
  uuid: string;
  code: string;
  name: string;
  initials: string;
  role: string;
  roleContexts?: string[];
  clusterId: string;
  parentId: string | null;
  tier: number;
  status: NodeStatus;
  statusText: string;
  scope: string;
  todaySchedule: string[];
  weekRoster: string[];
  deepLinks: SpatialDeepLink[];
  isAggregatedClass?: boolean;
  isZoomChild?: boolean;
  requiresSubstitute?: boolean;
  substituteAssigned?: string | null;
  switchAreaOnClick?: AreaId;
  aggregateSummary?: string;
}

export interface AreaAdapter {
  id: AreaId;
  shortTitle: string;
  title: string;
  subtitle: string;
  personaBadge: string;
  icon: string;
  coveragePct: number;
  coverageLabel: string;
  defaultSelectedId: string;
  kpis: SpatialKpi[];
  clusters: SpatialCluster[];
  delegations: SpatialDelegation[];
  nodes: SpatialNode[];
  zoomedStudents?: SpatialNode[];
}

export const HUES: Record<HueKey, { hex: string; bg: string; border: string; text: string; label: string }> = {
  indigo: { hex: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE', text: '#3730A3', label: 'IT / CSE' },
  violet: { hex: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6', label: 'ECE / EEE / ME' },
  emerald: { hex: '#059669', bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', label: 'Hostel & Mess' },
  amber: { hex: '#D97706', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', label: 'Exam Branch' },
  navy: { hex: '#0F172A', bg: '#F1F5F9', border: '#CBD5E1', text: '#0F172A', label: 'Security & Exec' },
  rose: { hex: '#E11D48', bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239', label: 'Alert / Exception' }
};

export const AREA_ADAPTERS: Record<AreaId, AreaAdapter> = {
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
          { label: 'Delegation Audit', route: '/principal/governance/delegations', type: 'secondary' }
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
          { label: 'Campus Roster', route: '/vice-principal/delegated-responsibilities', type: 'secondary' }
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
          { label: 'Academic Matrix', route: '/principal/people/departments', type: 'primary' }
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
          { label: 'Open IT Dept Map →', route: '/hod/classes?dept=IT', type: 'primary', switchArea: 'department' },
          { label: 'HOD Schedule', route: '/hod/faculty/attendance', type: 'secondary' }
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
          { label: 'Open CSE Dept Map →', route: '/hod/classes?dept=CSE', type: 'primary', switchArea: 'department' }
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
          { label: 'View Sub Roster', route: '/hod/faculty/directory?dept=ECE', type: 'primary' }
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
          { label: 'EEE Dept Schedule', route: '/hod/faculty/directory?dept=EEE', type: 'primary' }
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
          { label: 'ME Dept Schedule', route: '/hod/faculty/directory?dept=ME', type: 'primary' }
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
          { label: 'PG Research Roster', route: '/principal/people/assignment-tree', type: 'primary' }
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
          { label: 'Returns Timeline', route: '/hostel-manager/residents', type: 'secondary' }
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
          { label: 'HOD Master Schedule', route: '/hod/faculty/attendance', type: 'primary' },
          { label: 'Back to Institutional Map', route: '/org-map', type: 'secondary', switchArea: 'institutional' }
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
          { label: 'Open 3rd Yr IT-A Class', route: '/faculty/class', type: 'primary' },
          { label: 'Class Group /chat', route: '/faculty/class-requests', type: 'secondary' }
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
          { label: 'Assign Substitute Faculty', route: '/hod/faculty', type: 'action_substitute' },
          { label: 'Notify 3rd Yr IT-A /chat', route: '/faculty/class-requests', type: 'secondary' }
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
          { label: 'View Faculty Timetable', route: '/faculty/my-classes', type: 'primary' }
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
          { label: 'Open 2nd Yr IT Class', route: '/faculty/class', type: 'primary' }
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
          { label: 'Open Class /chat', route: '/faculty/class-requests', type: 'secondary' }
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
          { label: 'Open Class Roster', route: '/faculty/class', type: 'primary' }
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
          { label: 'Open Class Roster', route: '/faculty/class', type: 'primary' }
        ]
      }
    ],
    // Expanded Student Nodes when HOD/Faculty zooms into 3rd Year IT-A
    zoomedStudents: [
      { id: 'stu_1', uuid: 'stu_uuid_24JJ1A1240', code: '24JJ1A1240', name: 'Aarav Sharma', initials: 'AS', role: 'Student · 3rd Yr IT-A', roleContexts: ['Class Rep', '92% Att.'], clusterId: 'dc_sections', parentId: 'd_cls_3ita', tier: 3, status: 'online', statusText: 'On Campus · Checked in 08:42 AM', scope: '3rd Year IT-A · Day Scholar', todaySchedule: ['08:42 Main Gate RFID Entry', '09:00 LH-302 Present'], weekRoster: ['P', 'P', 'P', 'P', 'P'], deepLinks: [{ label: 'Student Profile', route: '/faculty/student-directory?roll=24JJ1A1240', type: 'primary' }] },
      { id: 'stu_2', uuid: 'stu_uuid_25JJ5A1203', code: '25JJ5A1203', name: 'Bhavya Srikanth', initials: 'BS', role: 'Student · 3rd Yr IT-A (Lateral)', roleContexts: ['Out on Gate Pass'], clusterId: 'dc_sections', parentId: 'd_cls_3ita', tier: 3, status: 'leave', statusText: 'Out on Approved Pass · Return 16:00', scope: '3rd Year IT-A · Girls Hostel 1', todaySchedule: ['10:15 Gate Pass #GP-884 Approved', 'Return due by 16:00'], weekRoster: ['P', 'P', 'P', 'P', 'Pass'], deepLinks: [{ label: 'Verify Gate Pass', route: '/hostel-manager/residents?roll=25JJ5A1203', type: 'primary' }] },
      { id: 'stu_3', uuid: 'stu_uuid_24JJ1A1218', code: '24JJ1A1218', name: 'Charan Teja Reddy', initials: 'CR', role: 'Student · 3rd Yr IT-A', roleContexts: ['68.4% Att. (<75% Flag)'], clusterId: 'dc_sections', parentId: 'd_cls_3ita', tier: 3, status: 'alert', statusText: 'Absent Today · Attendance <75%', scope: '3rd Year IT-A · Mentor: Prof. Karthik', todaySchedule: ['No Gate Entry Logged Today', 'Condonation Alert Sent'], weekRoster: ['P', 'A', 'P', 'A', 'A'], deepLinks: [{ label: 'Log Mentor Call', route: '/faculty/student-directory?roll=24JJ1A1218', type: 'primary' }] },
      { id: 'stu_4', uuid: 'stu_uuid_24JJ1A1252', code: '24JJ1A1252', name: 'Diya Malhotra', initials: 'DM', role: 'Student · 3rd Yr IT-A', roleContexts: ['96% Att.'], clusterId: 'dc_sections', parentId: 'd_cls_3ita', tier: 3, status: 'online', statusText: 'On Campus · LH-302', scope: '3rd Year IT-A · Girls Hostel 2', todaySchedule: ['08:50 LH-302 Biometric Verified'], weekRoster: ['P', 'P', 'P', 'P', 'P'], deepLinks: [{ label: 'Student Profile', route: '/faculty/student-directory?roll=24JJ1A1252', type: 'primary' }] },
      { id: 'stu_5', uuid: 'stu_uuid_24JJ1A1261', code: '24JJ1A1261', name: 'Eshwar Prasad', initials: 'EP', role: 'Student · 3rd Yr IT-A', roleContexts: ['72.1% Att. (<75% Flag)'], clusterId: 'dc_sections', parentId: 'd_cls_3ita', tier: 3, status: 'online', statusText: 'On Campus · Attendance Watch', scope: '3rd Year IT-A · Boys Hostel 1', todaySchedule: ['08:55 LH-302 Present'], weekRoster: ['A', 'P', 'A', 'P', 'P'], deepLinks: [{ label: 'Attendance Ledger', route: '/faculty/student-directory?roll=24JJ1A1261', type: 'primary' }] },
      { id: 'stu_6', uuid: 'stu_uuid_25JJ5A1209', code: '25JJ5A1209', name: 'Farhan Siddiqui', initials: 'FS', role: 'Student · 3rd Yr IT-A (Lateral)', roleContexts: ['89% Att.'], clusterId: 'dc_sections', parentId: 'd_cls_3ita', tier: 3, status: 'online', statusText: 'On Campus · LH-302', scope: '3rd Year IT-A · Day Scholar', todaySchedule: ['08:38 Main Gate Entry'], weekRoster: ['P', 'P', 'P', 'P', 'P'], deepLinks: [{ label: 'Student Profile', route: '/faculty/student-directory?roll=25JJ5A1209', type: 'primary' }] }
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
          { label: 'Returns Timeline', route: '/hostel-manager/residents', type: 'secondary' }
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
          { label: 'Open Returns Timeline', route: '/hostel-manager/residents?block=B2', type: 'primary' },
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
          { label: 'Mess Headcount Sync', route: '/mess', type: 'primary' }
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
