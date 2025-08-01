import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
// @ts-ignore
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
  setIsAuthenticated: (value: boolean | ((prevState: boolean) => boolean)) => void;
}

const Login = ({ setIsAuthenticated }: LoginProps) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('http://localhost:8000/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.access && data.refresh) {
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        setMessage({
          text: `Welcome back, ${data.user?.username || 'user'}!`,
          type: 'success',
        });
        setIsAuthenticated(true);
        setTimeout(() => navigate('/'), 800);
      } else {
        setMessage({
          text: data.message || 'Invalid credentials. Try again!',
          type: 'error',
        });
      }
    } catch (err) {
      setMessage({
        text: 'Login failed. Check your connection or server.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-indigo-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Radial Gradient Vignette */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-radial from-indigo-200/40 via-transparent to-transparent dark:from-indigo-900/40" />
      </div>
      {/* SVG Dot Pattern Overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-20">
        <svg width="100%" height="100%" className="w-full h-full">
          <defs>
            <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="2" fill="#6366f1" fillOpacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>
      {/* Animated Background Blobs */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          className="w-96 h-96 bg-indigo-200 dark:bg-indigo-900 rounded-full blur-3xl opacity-30 absolute -top-32 -left-32"
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
        />
        <motion.div
          className="w-80 h-80 bg-pink-200 dark:bg-pink-900 rounded-full blur-3xl opacity-20 absolute -bottom-24 -right-24"
          animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}
        />
        {/* Extra Blobs for Depth */}
        <motion.div
          className="w-72 h-72 bg-yellow-100 dark:bg-yellow-900 rounded-full blur-3xl opacity-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 15, 0] }}
          transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
        />
        <motion.div
          className="w-60 h-60 bg-green-200 dark:bg-green-900 rounded-full blur-3xl opacity-10 absolute top-10 right-1/3"
          animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 16, ease: 'easeInOut' }}
        />
      </motion.div>
      {/* Glassmorphism Card with Entrance Animation */}
      <motion.div
        className="w-full max-w-md px-10 py-12 bg-white/40 dark:bg-gray-900/60 rounded-2xl shadow-2xl flex flex-col items-center z-10 backdrop-blur-xl border border-white/30 dark:border-gray-700/40"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 60, damping: 12 }}
      >
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-indigo-700 dark:text-indigo-300 mb-4 drop-shadow-lg">Welcome Back</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">Sign in to continue with <span className="font-bold text-indigo-600 dark:text-indigo-300">prodactivity</span></p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          {/* Animated Message */}
          <AnimatePresence>
            {message && (
              <motion.div
                key={message.text}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`mt-6 p-3 rounded-lg text-center text-sm font-medium transition-all duration-300 shadow-md ${
                  message.type === 'success'
                    ? 'bg-green-100 text-green-700'
                    : message.type === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Email Input */}
          <div className="relative">
            <motion.div
              className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Mail size={18} />
            </motion.div>
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/80 dark:bg-gray-800/80 dark:text-white shadow-sm focus:shadow-indigo-200 dark:focus:shadow-indigo-900"
              required
            />
          </div>
          {/* Password Input */}
          <div className="relative">
            <motion.div
              className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Lock size={18} />
            </motion.div>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/80 dark:bg-gray-800/80 dark:text-white shadow-sm focus:shadow-indigo-200 dark:focus:shadow-indigo-900"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {/* Animated Sign In Button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.04 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className={`w-full py-3 rounded-lg bg-indigo-600 text-white font-medium flex items-center justify-center transition-all duration-200 shadow-lg ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-700'
            }`}
          >
            {loading ? (
              <span className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
              <LogIn size={18} className="mr-2" />
            )}
            {loading ? 'Signing in...' : 'Sign In'}
          </motion.button>
        </form>
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-gray-600 dark:text-gray-300">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 dark:text-indigo-300 font-medium hover:text-indigo-800 dark:hover:text-indigo-400 transition">
              Create Account
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
