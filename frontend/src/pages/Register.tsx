import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';
import TermsModal from '../components/common/TermsModal';

interface RegisterProps {
  setIsAuthenticated: (value: boolean | ((prevState: boolean) => boolean)) => void;
}

const Register = ({ setIsAuthenticated }: RegisterProps) => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!agreedToTerms) {
      setMessage({
        text: 'You must agree to the Terms and Conditions to register.',
        type: 'error'
      });
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage({
        text: 'Passwords do not match',
        type: 'error'
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/api/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: `Account created successfully!`, type: 'success' });
        setForm({ username: '', email: '', password: '', confirmPassword: '' });

        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setMessage({
          text: data.message || 'Registration failed',
          type: 'error'
        });
      }
    } catch (error) {
      setMessage({
        text: 'Registration failed. Check your connection or server.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
      <div className="w-full max-w-md px-8 py-10 bg-white rounded-2xl shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-indigo-600 mb-2">Create Account</h1>
          <p className="text-gray-600">Join Prodactivity to boost your productivity</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <User size={18} />
            </div>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Mail size={18} />
            </div>
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <CheckCircle size={18} />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-center">
            <input
              id="terms"
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              required
            />
            <label htmlFor="terms" className="text-gray-600 text-sm">
              I agree to the{' '}
              <button
                type="button"
                className="text-indigo-600 underline hover:text-indigo-800 focus:outline-none"
                onClick={() => setShowTermsModal(true)}
                tabIndex={0}
              >
                Terms and Conditions
              </button>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg bg-indigo-600 text-white font-medium flex items-center justify-center transition-colors ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-700'
            }`}
          >
            {loading ? (
              <span className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            ) : null}
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {message && (
          <div
            className={`mt-6 p-3 rounded-lg text-center ${
              message.type === 'success' ? 'bg-green-100 text-green-700' :
              message.type === 'error' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-800 transition">
              Sign In
            </Link>
          </p>
        </div>
      </div>
      <TermsModal open={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  );
};

export default Register;
