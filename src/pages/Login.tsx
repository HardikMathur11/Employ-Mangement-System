import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { currentUser, login, loginWithGoogle } = useAuth();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  if (currentUser) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-900">
    <div className="w-full max-w-md px-2">
      <GlassCard className="p-6 sm:p-8">
        {/* Logo / Icon */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-card">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Welcome Back</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Sign in to your account</p>
        </div>
  
  {/* Form */}
  <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-400 border border-gray-200 dark:border-gray-700 outline-none"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>
  
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-400 border border-gray-200 dark:border-gray-700 outline-none"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
  
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium hover:from-primary-600 hover:to-primary-700 transition shadow-card"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Sign In'}
          </button>
        </form>
  
        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          <span className="px-3 text-gray-500 dark:text-gray-400 text-sm">OR</span>
          <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
        </div>
  
        {/* Google Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g>
              <path d="M21.35 11.1h-9.2v2.9h5.26c-.23 1.3-.92 2.4-1.97 3.16v2.6h3.18c1.86-1.71 2.93-4.33 2.93-7.66 0-.52-.04-1.03-.2-1.99z" fill="#4285F4"/>
              <path d="M12.15 22c2.7 0 4.96-.9 6.63-2.43l-3.18-2.6c-.88.6-2.02.96-3.45.96-2.65 0-4.9-1.78-5.7-4.18H3.06v2.62C4.72 19.9 8.14 22 12.15 22z" fill="#34A853"/>
              <path d="M6.46 13.78A6.99 6.99 0 0 1 6 12.15c0-.64.1-1.25.28-1.84V7.69H3.06A10.04 10.04 0 0 0 2 12.15c0 1.66.4 3.22 1.12 4.6l3.34-2.97z" fill="#FBBC05"/>
              <path d="M12.15 6.48c1.47 0 2.8.5 3.84 1.47l2.88-2.88C16.98 3.04 14.72 2 12.15 2 8.14 2 4.72 4.1 3.06 7.69l3.22 2.62c.8-2.4 3.05-4.18 5.87-4.18z" fill="#EA4335"/>
            </g>
          </svg>
          Continue with Google
        </button>
  
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-500 font-medium hover:text-primary-600 dark:hover:text-primary-400">
            Sign up
          </Link>
        </p>
      </GlassCard>
    </div>
  </div>
  );
};

export default Login;