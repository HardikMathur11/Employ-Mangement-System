import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  ClipboardList,
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { Task, Attendance, LeaveRequest } from '../types';
import {
  format,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from 'date-fns';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();

  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingLeaves: 0,
    presentToday: 0,
    monthlyAttendance: 0,
  });

  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) return;

      try {
        const toJsDate = (value: any): Date | null => {
          if (!value) return null;
          if (value instanceof Date) return value;

          if (typeof value === 'object' && typeof value.toDate === 'function') {
            try {
              return value.toDate();
            } catch {
              return null;
            }
          }

          const parsed = new Date(value);
          return isNaN(parsed.getTime()) ? null : parsed;
        };

        // Fetch employees count (admin/manager only)
        let totalEmployees = 0;
        if (currentUser.role === 'admin' || currentUser.role === 'manager') {
          const employeesSnapshot = await getDocs(collection(db, 'employees'));
          totalEmployees = employeesSnapshot.size;
        }

        // Fetch tasks
        const tasksQuery =
          currentUser.role === 'employee'
            ? query(
                collection(db, 'tasks'),
                where('assignedTo', '==', currentUser.uid)
              )
            : query(collection(db, 'tasks'));

        const tasksSnapshot = await getDocs(tasksQuery);
        const tasks: Task[] = [];

        tasksSnapshot.forEach((doc) => {
          const data = doc.data();
          tasks.push({
            id: doc.id,
            ...data,
            dueDate: toJsDate((data as any).dueDate),
            createdAt: toJsDate((data as any).createdAt) || new Date(),
            updatedAt: toJsDate((data as any).updatedAt) || new Date(),
          } as Task);
        });

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(
          (task) => task.status === 'completed'
        ).length;

        // Fetch recent tasks for current user
        const recentTasksQuery = query(
          collection(db, 'tasks'),
          where('assignedTo', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(5)
        );

        const recentTasksSnapshot = await getDocs(recentTasksQuery);
        const recentTasksList: Task[] = [];

        recentTasksSnapshot.forEach((doc) => {
          const data = doc.data();
          recentTasksList.push({
            id: doc.id,
            ...data,
            dueDate: toJsDate((data as any).dueDate),
            createdAt: toJsDate((data as any).createdAt) || new Date(),
            updatedAt: toJsDate((data as any).updatedAt) || new Date(),
          } as Task);
        });

        setRecentTasks(recentTasksList);

        // Fetch leave requests
        const leaveQuery =
          currentUser.role === 'employee'
            ? query(
                collection(db, 'leaveRequests'),
                where('employeeId', '==', currentUser.uid)
              )
            : query(
                collection(db, 'leaveRequests'),
                where('status', '==', 'pending')
              );

        const leaveSnapshot = await getDocs(leaveQuery);
        const pendingLeaves = leaveSnapshot.size;
        const upcoming: LeaveRequest[] = [];

        leaveSnapshot.forEach((doc) => {
          const data = doc.data() as any;
          const start =
            data.startDate && typeof data.startDate.toDate === 'function'
              ? data.startDate.toDate()
              : new Date(data.startDate || Date.now());

          if (start >= new Date()) {
            upcoming.push({ id: doc.id, ...data } as LeaveRequest);
          }
        });

        setUpcomingLeaves(upcoming.slice(0, 5));

        // Fetch attendance data
        const today = format(new Date(), 'yyyy-MM-dd');
        const attendanceQuery =
          currentUser.role === 'employee'
            ? query(
                collection(db, 'attendance'),
                where('employeeId', '==', currentUser.uid)
              )
            : query(collection(db, 'attendance'));

        const attendanceSnapshot = await getDocs(attendanceQuery);
        let presentToday = 0;
        let monthlyAttendanceCount = 0;

        const currentMonth = new Date();
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        attendanceSnapshot.forEach((doc) => {
          const attendance = doc.data() as Attendance;

          if (attendance.date === today && attendance.status === 'present') {
            presentToday++;
          }

          if (
            currentUser.role === 'employee' &&
            attendance.employeeId === currentUser.uid
          ) {
            const attendanceDate = new Date(attendance.date);
            if (
              isWithinInterval(attendanceDate, { start: monthStart, end: monthEnd })
            ) {
              monthlyAttendanceCount++;
            }
          }
        });

        setStats({
          totalEmployees,
          totalTasks,
          completedTasks,
          pendingLeaves,
          presentToday,
          monthlyAttendance: monthlyAttendanceCount,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Welcome Section */}
      <GlassCard className="mb-6 shadow-card">
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Welcome back, {currentUser?.displayName || 'User'}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Here's what's happening with your {currentUser?.role === 'admin' ? 'organization' : 'tasks'} today.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center">
            <span className="bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400 text-xs font-medium px-2.5 py-1 rounded-full flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GlassCard className="shadow-card">
          <div className="p-4 flex items-center">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 mr-4">
              <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Employees
              </p>
              <div className="flex items-center">
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats.totalEmployees}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="shadow-card">
          <div className="p-4 flex items-center">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 mr-4">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Present Today
              </p>
              <div className="flex items-center">
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats.presentToday}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="shadow-card">
          <div className="p-4 flex items-center">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-4">
              <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tasks
              </p>
              <div className="flex items-baseline">
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.completedTasks}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 ml-1">/ {stats.totalTasks}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="shadow-card">
          <div className="p-4 flex items-center">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 mr-4">
              <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Leaves
              </p>
              <div className="flex items-center">
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats.pendingLeaves}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Task Completion Rate
            </h2>
            <TrendingUp className="w-5 h-5 text-gray-500" />
          </div>
          <div className="flex items-center justify-center">
            {stats.totalTasks === 0 ? (
              <div className="text-gray-500 dark:text-gray-400">
                No tasks yet
              </div>
            ) : (
              <div className="relative w-48 h-48">
                {(() => {
                  const rate = Math.round(
                    (stats.completedTasks / Math.max(stats.totalTasks, 1)) * 100
                  );
                  return (
                    <>
                      <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path
                          className="text-gray-200 dark:text-gray-800"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                        />
                        <path
                          className="text-purple-600"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${rate}, 100`}
                          d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {rate}%
                          </div>
                          <div className="text-xs text-gray-500">Completed</div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Upcoming Leaves
            </h2>
            <Calendar className="w-5 h-5 text-gray-500" />
          </div>
          {upcomingLeaves.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">
              No upcoming leaves
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingLeaves.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between p-3 bg-white/20 dark:bg-black/20 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {l.employeeName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {l.type} •{' '}
                      {format(
                        new Date(
                          (l as any).startDate?.toDate
                            ? (l as any).startDate.toDate()
                            : (l as any).startDate || new Date()
                        ),
                        'MMM dd'
                      )}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Employees
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalEmployees}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </GlassCard>
        )}

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Tasks
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalTasks}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Completed Tasks
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.completedTasks}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </GlassCard>

        {currentUser?.role === 'employee' ? (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  This Month
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.monthlyAttendance}
                </p>
                <p className="text-xs text-gray-500">Days Present</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pending Leaves
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.pendingLeaves}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Tasks and Leaves Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Recent Tasks */}
        <GlassCard className="shadow-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center">
              <ClipboardList className="w-5 h-5 text-primary-500 mr-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Tasks</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
              {recentTasks.length} tasks
            </span>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${getTaskStatusColor(task.status)}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No tasks assigned yet
              </div>
            )}
          </div>
        </GlassCard>

        {/* Upcoming Leaves */}
        <GlassCard className="shadow-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-primary-500 mr-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Upcoming Leaves</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
              {upcomingLeaves.length} requests
            </span>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {upcomingLeaves.length > 0 ? (
              upcomingLeaves.map((leave) => (
                <div key={leave.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {leave.employeeName || 'Employee'}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      leave.status === 'approved'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : leave.status === 'rejected'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                  <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>
                      {format(
                        new Date(
                          (leave as any).startDate?.toDate
                            ? (leave as any).startDate.toDate()
                            : (leave as any).startDate || new Date()
                        ),
                        'MMM dd'
                      )}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No upcoming leave requests
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Dashboard;
