import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import GlassCard from '../components/GlassCard';
import { useAuth } from '../contexts/AuthContext';
import { Task, Attendance } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

const Insights: React.FC = () => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        const tasksQ = query(collection(db, 'tasks'), where('assignedTo', '==', currentUser.uid));
        const tasksSnap = await getDocs(tasksQ);
        const t: Task[] = [];
        tasksSnap.forEach(doc => t.push({ id: doc.id, ...(doc.data() as any) } as Task));
        setTasks(t);

        const attQ = query(collection(db, 'attendance'), where('employeeId', '==', currentUser.uid));
        const attSnap = await getDocs(attQ);
        const a: Attendance[] = [];
        attSnap.forEach(doc => a.push({ id: doc.id, ...(doc.data() as any) } as Attendance));
        setAttendance(a);
      } catch {
        // ignore
      }
    };
    load();
  }, [currentUser]);

  const taskProgressByDay = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach(task => {
      const created = (task as any).createdAt;
      const d = created && typeof (created as any).toDate === 'function' ? created.toDate() : new Date();
      const key = format(d, 'MMM dd');
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const attendanceByDay = useMemo(() => {
    const map = new Map<string, number>();
    attendance.forEach(a => {
      const key = a.date;
      map.set(key, (map.get(key) || 0) + (a.status === 'present' ? 1 : 0));
    });
    return Array.from(map.entries()).slice(-14).map(([date, value]) => ({ name: date, value }));
  }, [attendance]);

  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.status === 'completed').length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Insights</h1>
        <p className="text-gray-600 dark:text-gray-400">Your performance, attendance, and task progress</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Task Creation Trend</h3>
            <span className="text-sm text-gray-500">Last periods</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={taskProgressByDay}>
                <defs>
                  <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrimary)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Attendance (last 14 days)</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Completion Rate</h3>
          <div className="h-56 flex items-center justify-center">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path className="text-gray-200 dark:text-gray-800" stroke="currentColor" strokeWidth="4" fill="none" d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" />
                <path className="text-blue-600" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray={`${completionRate}, 100`} d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{completionRate}%</div>
                  <div className="text-xs text-gray-500">Tasks Completed</div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Insights;


