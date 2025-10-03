import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import GlassCard from '../components/GlassCard';
import { useAuth } from '../contexts/AuthContext';
import { Task, LeaveRequest, Attendance } from '../types';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ef4444'];

const Reports: React.FC = () => {
  const { currentUser } = useAuth();
  const [taskSummary, setTaskSummary] = useState({ total: 0, completed: 0, inProgress: 0, pending: 0 });
  const [leaveSummary, setLeaveSummary] = useState({ total: 0, approved: 0, rejected: 0, pending: 0 });
  const [attendanceSummary, setAttendanceSummary] = useState({ present: 0, absent: 0, late: 0, halfDay: 0 });

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        const tasksQ = currentUser.role === 'employee'
          ? query(collection(db, 'tasks'), where('assignedTo', '==', currentUser.uid))
          : query(collection(db, 'tasks'));
        const tasksSnap = await getDocs(tasksQ);
        let total = 0, completed = 0, inProgress = 0, pending = 0;
        tasksSnap.forEach(doc => {
          total++;
          const t = doc.data() as Task;
          if (t.status === 'completed') completed++;
          else if (t.status === 'in-progress') inProgress++;
          else pending++;
        });
        setTaskSummary({ total, completed, inProgress, pending });

        const leaveQ = currentUser.role === 'employee'
          ? query(collection(db, 'leaveRequests'), where('employeeId', '==', currentUser.uid))
          : query(collection(db, 'leaveRequests'));
        const leaveSnap = await getDocs(leaveQ);
        let lt = 0, la = 0, lr = 0, lp = 0;
        leaveSnap.forEach(doc => {
          lt++;
          const l = doc.data() as LeaveRequest;
          if (l.status === 'approved') la++;
          else if (l.status === 'rejected') lr++;
          else lp++;
        });
        setLeaveSummary({ total: lt, approved: la, rejected: lr, pending: lp });

        const attQ = currentUser.role === 'employee'
          ? query(collection(db, 'attendance'), where('employeeId', '==', currentUser.uid))
          : query(collection(db, 'attendance'));
        const attSnap = await getDocs(attQ);
        let present = 0, absent = 0, late = 0, halfDay = 0;
        attSnap.forEach(doc => {
          const a = doc.data() as Attendance;
          if (a.status === 'present') present++;
          else if (a.status === 'absent') absent++;
          else if (a.status === 'late') late++;
          else if (a.status === 'half-day') halfDay++;
        });
        setAttendanceSummary({ present, absent, late, halfDay });
      } catch (e) {
        // silent fail into empty summaries
      }
    };
    load();
  }, [currentUser]);

  const taskBarData = [
    { name: 'Completed', value: taskSummary.completed },
    { name: 'In Progress', value: taskSummary.inProgress },
    { name: 'Pending', value: taskSummary.pending },
  ];

  const leavePieData = [
    { name: 'Approved', value: leaveSummary.approved },
    { name: 'Pending', value: leaveSummary.pending },
    { name: 'Rejected', value: leaveSummary.rejected },
  ];

  const attendanceLineData = [
    { name: 'Present', value: attendanceSummary.present },
    { name: 'Absent', value: attendanceSummary.absent },
    { name: 'Late', value: attendanceSummary.late },
    { name: 'Half Day', value: attendanceSummary.halfDay },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Reports</h1>
        <p className="text-gray-600 dark:text-gray-400">Summary tables and organization-wide charts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tasks Overview</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Leave Status</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leavePieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {leavePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Attendance Mix</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceLineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">KPI Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-lg bg-white/20 dark:bg-black/20">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{taskSummary.total}</div>
          </div>
          <div className="p-4 rounded-lg bg-white/20 dark:bg-black/20">
            <div className="text-sm text-gray-600 dark:text-gray-400">Leave Requests</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{leaveSummary.total}</div>
          </div>
          <div className="p-4 rounded-lg bg-white/20 dark:bg-black/20">
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed Tasks</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{taskSummary.completed}</div>
          </div>
          <div className="p-4 rounded-lg bg-white/20 dark:bg-black/20">
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending Leaves</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{leaveSummary.pending}</div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default Reports;


