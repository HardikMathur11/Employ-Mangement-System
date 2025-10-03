import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Insights from './pages/Insights';
import Employees from './pages/Employees';
import Tasks from './pages/Tasks';
import Attendance from './pages/Attendance';
import LeaveRequests from './pages/LeaveRequests';
import Organization from './pages/Organization';
import Profile from './pages/Profile';
import Unauthorized from './pages/Unauthorized';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#1f2937',
                },
              }}
            />
            
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              <Route path="/*" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                
                <Route path="employees" element={
                  <ProtectedRoute requiredRoles={['admin', 'manager']}>
                    <Employees />
                  </ProtectedRoute>
                } />
                
                <Route path="tasks" element={<Tasks />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="leave" element={<LeaveRequests />} />
                <Route path="reports" element={
                  <ProtectedRoute requiredRoles={['admin', 'manager']}>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="insights" element={<Insights />} />
                
                <Route path="organization" element={
                  <ProtectedRoute requiredRoles={['admin', 'manager']}>
                    <Organization />
                  </ProtectedRoute>
                } />
              </Route>
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;