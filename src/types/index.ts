export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'employee';
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  userUid?: string;
  contact: string;
  designation: string;
  department: string;
  managerId?: string;
  managerName?: string;
  role: 'admin' | 'manager' | 'employee';
  photoURL?: string;
  joinDate: Date;
  salary?: number;
  address?: string;
  documents: Document[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  assignedToName: string;
  assignedByName: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  checkIn: Date;
  checkOut?: Date;
  date: string; // YYYY-MM-DD format
  totalHours?: number;
  status: 'present' | 'absent' | 'late' | 'half-day';
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'sick' | 'vacation' | 'personal' | 'emergency';
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approverName?: string;
  appliedAt: Date;
  reviewedAt?: Date;
  notes?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'task' | 'leave' | 'system' | 'attendance';
  isRead: boolean;
  createdAt: Date;
  data?: any;
}