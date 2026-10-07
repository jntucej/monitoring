export interface OccupancyStats {
  total: number;
  byType: {
    student: number;
    faculty: number;
    staff: number;
    worker: number;
    visitor: number;
    parent: number;
  };
  byDepartment: Record<string, number>;
  lastUpdated: string;
}

export interface DailyStats {
  date: string;
  entries: number;
  exits: number;
  byType: {
    student: { in: number; out: number };
    faculty: { in: number; out: number };
    staff: { in: number; out: number };
    worker: { in: number; out: number };
    visitor: { in: number; out: number };
    parent: { in: number; out: number };
  };
  peakHour: { hour: number; count: number };
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  totalEntries: number;
  totalExits: number;
  dailyBreakdown: DailyStats[];
  topDepartments: Array<{ name: string; count: number }>;
}

export interface ExportOptions {
  format: 'pdf' | 'csv';
  dateRange: { from: string; to: string };
  personType?: string;
  department?: string;
  includeCharts?: boolean;
}

export interface VisitorAnalytics {
  totalVisitors: number;
  uniqueVisitors: number;
  averageStayHours: number;
  peakVisitDays: Array<{ day: string; count: number }>;
  topHosts: Array<{ name: string; count: number }>;
  purposes: Array<{ purpose: string; count: number }>;
}

export interface WorkerAnalytics {
  totalWorkers: number;
  activeWorkers: number;
  shiftCompliance: number; // percentage
  overtimeHours: number;
  lateEntries: number;
  byShift: {
    morning: number;
    evening: number;
    night: number;
  };
}
export interface FacultyAttendanceStats {
  rate: number;
  today: number;
  total: number;
}

export interface WorkerAdherenceStats {
  rate: number;
  onTime: number;
  late: number;
}

export interface PeakHour {
  hour: number;
  count: number;
}

export interface DepartmentActivity {
  department: string;
  entries: number;
  exits: number;
}

export interface WeekdayComparison {
  weekday: number;
  weekend: number;
}

export interface TimelinessStats {
  onTime: number;
  late: number;
  absent: number;
}

export interface HourlyPattern {
  hour: number;
  students: number;
  faculty: number;
}

export interface MovementRatio {
  student: number;
  faculty: number;
  staff: number;
  worker: number;
}

export interface EnhancedAnalytics {
  facultyAttendance: FacultyAttendanceStats;
  workerShiftAdherence: WorkerAdherenceStats;
  peakHours: PeakHour[];
  departmentActivity: DepartmentActivity[];
  weekdayVsWeekend: WeekdayComparison;
  facultyTimeliness: TimelinessStats;
  hourlyPattern: HourlyPattern[];
  movementRatio: MovementRatio;
}
