import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Attendance as AttendanceType } from '../types';
import { Clock, CheckCircle, Calendar, MapPin } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, differenceInHours } from 'date-fns';

const Attendance: React.FC = () => {
  const { currentUser } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceType[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    averageHours: 0,
  });

  useEffect(() => {
    fetchAttendanceRecords();
  }, [currentUser, selectedMonth]);

  const fetchAttendanceRecords = async () => {
    if (!currentUser) return;

    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);

      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('employeeId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(attendanceQuery);
      const records: AttendanceType[] = [];
      let todayRecord: AttendanceType | null = null;
      
      querySnapshot.forEach((doc) => {
        const attendance = {
          id: doc.id,
          ...doc.data(),
          checkIn: doc.data().checkIn?.toDate(),
          checkOut: doc.data().checkOut?.toDate(),
        } as AttendanceType;
        
        records.push(attendance);
        
        if (attendance.date === format(new Date(), 'yyyy-MM-dd')) {
          todayRecord = attendance;
        }
      });

      setAttendanceRecords(records);
      setTodayAttendance(todayRecord);

      // Calculate stats for selected month
      const monthRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= monthStart && recordDate <= monthEnd;
      });

      const presentDays = monthRecords.filter(record => record.status === 'present').length;
      const totalDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).length;
      const totalHours = monthRecords
        .filter(record => record.totalHours)
        .reduce((sum, record) => sum + (record.totalHours || 0), 0);

      setStats({
        totalDays,
        presentDays,
        absentDays: totalDays - presentDays,
        averageHours: presentDays > 0 ? totalHours / presentDays : 0,
      });

    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!currentUser) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const now = new Date();

      await addDoc(collection(db, 'attendance'), {
        employeeId: currentUser.uid,
        employeeName: currentUser.displayName,
        checkIn: now,
        date: today,
        status: 'present',
      });

      toast.success('Checked in successfully!');
      fetchAttendanceRecords();
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser || !todayAttendance) return;

    try {
      const now = new Date();
      const totalHours = differenceInHours(now, new Date(todayAttendance.checkIn));

      await updateDoc(doc(db, 'attendance', todayAttendance.id), {
        checkOut: now,
        totalHours,
      });

      toast.success('Checked out successfully!');
      fetchAttendanceRecords();
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error('Failed to check out');
    }
  };

  const getAttendanceForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return attendanceRecords.find(record => record.date === dateString);
  };

  const getDayStatus = (date: Date) => {
    if (date > new Date()) return 'future';
    
    const attendance = getAttendanceForDate(date);
    if (!attendance) return 'absent';
    
    return attendance.status;
  };

  const getDayStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-500 text-white';
      case 'absent':
        return 'bg-red-500 text-white';
      case 'late':
        return 'bg-yellow-500 text-white';
      case 'half-day':
        return 'bg-orange-500 text-white';
      case 'future':
        return 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const monthDays = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth),
  });

  if (loading) {
    return <LoadingSpinner className="h-64" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" subtitle="Track your daily attendance" />

      {/* Today's Attendance */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Attendance</h2>
              <p className="text-gray-600 dark:text-gray-400">{format(new Date(), 'EEEE, MMMM dd, yyyy')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {todayAttendance?.checkIn ? format(new Date(todayAttendance.checkIn), 'HH:mm') : '--:--'}
            </div>
            <p className="text-gray-600 dark:text-gray-400">Check In</p>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {todayAttendance?.checkOut ? format(new Date(todayAttendance.checkOut), 'HH:mm') : '--:--'}
            </div>
            <p className="text-gray-600 dark:text-gray-400">Check Out</p>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {todayAttendance?.totalHours ? `${todayAttendance.totalHours.toFixed(1)}h` : '0.0h'}
            </div>
            <p className="text-gray-600 dark:text-gray-400">Total Hours</p>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          {!todayAttendance ? (
            <button
              onClick={handleCheckIn}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Check In</span>
            </button>
          ) : !todayAttendance.checkOut ? (
            <button
              onClick={handleCheckOut}
              className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2"
            >
              <Clock className="w-5 h-5" />
              <span>Check Out</span>
            </button>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-8 py-3 rounded-lg flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Completed for today</span>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Monthly Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Present Days</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.presentDays}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Absent Days</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.absentDays}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Hours</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.averageHours.toFixed(1)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Attendance %</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {stats.totalDays > 0 ? Math.round((stats.presentDays / stats.totalDays) * 100) : 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Calendar View */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Calendar</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
            >
              ←
            </button>
            <span className="text-lg font-medium text-gray-900 dark:text-white">
              {format(selectedMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {monthDays.map((day) => {
            const status = getDayStatus(day);
            const attendance = getAttendanceForDate(day);
            
            return (
              <div
                key={day.toISOString()}
                className={`
                  h-12 rounded-lg flex items-center justify-center text-sm font-medium cursor-pointer
                  ${getDayStatusColor(status)}
                  ${isToday(day) ? 'ring-2 ring-blue-500' : ''}
                  hover:opacity-80 transition-opacity
                `}
                title={attendance ? `${format(day, 'MMM dd')}: ${status} ${attendance.totalHours ? `(${attendance.totalHours.toFixed(1)}h)` : ''}` : format(day, 'MMM dd')}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 mt-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Present</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Absent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Late</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Half Day</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default Attendance;