import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  Home, 
  Users, 
  ClipboardList, 
  Calendar, 
  FileText, 
  Bell, 
  Settings, 
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  User,
  TrendingUp
} from 'lucide-react';
import GlassCard from './GlassCard';
import NotificationCenter from './NotificationCenter';
import toast from 'react-hot-toast';

const Layout: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const lastSeenRef = useRef<number>(0);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'manager', 'employee'] },
    { name: 'Employees', href: '/employees', icon: Users, roles: ['admin', 'manager'] },
    { name: 'Tasks', href: '/tasks', icon: ClipboardList, roles: ['admin', 'manager', 'employee'] },
    { name: 'Attendance', href: '/attendance', icon: Calendar, roles: ['admin', 'manager', 'employee'] },
    { name: 'Leave Requests', href: '/leave', icon: FileText, roles: ['admin', 'manager', 'employee'] },
    { name: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'manager'] },
    { name: 'Insights', href: '/insights', icon: TrendingUp, roles: ['admin', 'manager', 'employee'] },
    { name: 'Organization', href: '/organization', icon: Users, roles: ['admin', 'manager'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(currentUser?.role || 'employee')
  );

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Realtime toast for new notifications
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const createdAt = change.doc.data().createdAt?.toDate?.() || new Date();
          const ts = createdAt.getTime();
          if (ts > lastSeenRef.current) {
            lastSeenRef.current = ts;
            const n = change.doc.data() as any;
            toast(n.title || 'New notification', { icon: '🔔' });
          }
        }
      });
    });
    return unsub;
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm
      `}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">EMS</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="space-y-1 flex-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-primary-50 dark:bg-gray-700/50 text-primary-600 dark:text-primary-400 font-medium shadow-button' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/30'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary-500 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  <span className={`${isActive ? 'font-medium' : ''}`}>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 space-y-1">
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors"
            >
              <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span>Profile</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors"
            >
              <LogOut className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mr-2"
              >
                <Menu className="w-6 h-6" />
              </button>

              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 capitalize">
                {location.pathname.substring(1) || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary-500 rounded-full"></span>
                </button>

                {showNotifications && (
                  <NotificationCenter onClose={() => setShowNotifications(false)} />
                )}
              </div>

              <div className="flex items-center space-x-3">
                <img
                  src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'User')}&background=random`}
                  alt={currentUser?.displayName}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                />
                <span className="hidden sm:block text-sm font-medium text-gray-800 dark:text-gray-100">
                  {currentUser?.displayName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;