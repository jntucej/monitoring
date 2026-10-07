export type IntegrationType = 
  | 'attendance'
  | 'sms'
  | 'email'
  | 'hr_sync'
  | 'sis_sync'
  | 'visitor_pre_reg'
  | 'mobile_api';

export interface IntegrationConfig {
  id: string;
  type: IntegrationType;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  personId: string;
  uniqueId: string;
  name: string;
  date: string;
  timeIn?: string;
  timeOut?: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
  department?: string;
  personType: string;
}

export interface VisitorPreRegistration {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  hostId: string;
  hostName: string;
  purpose: string;
  expectedArrival: string;
  expectedDeparture: string;
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out';
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SMSMessage {
  id: string;
  to: string;
  from: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: string;
  error?: string;
  createdAt: string;
}

export interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: string;
  error?: string;
  createdAt: string;
}

export interface HREmployee {
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  isHod: boolean;
  joiningDate: string;
  status: 'active' | 'inactive';
}

export interface SISStudent {
  rollNumber: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  year: number;
  section: string;
  batch: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  status: 'active' | 'inactive' | 'graduated';
}

export interface MobileAppSession {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  platform: 'ios' | 'android' | 'web';
  token: string;
  lastActive: string;
  createdAt: string;
}
