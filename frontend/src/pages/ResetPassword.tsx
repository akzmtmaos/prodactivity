import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage('Missing or invalid reset token.');
    }
  }, [token]);

  const submit = async () => {
    if (!token) return;
    if (!password || password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:8000/api/password-reset/confirm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Password reset successful. You can now log in.');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setMessage(data.detail || 'Reset failed.');
      }
    } catch (e) {
      setMessage('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow w-full max-w-md">
        <h1 className="text-xl font-semibold mb-4">Reset Password</h1>
        {message && <div className="mb-3 text-sm text-gray-700 dark:text-gray-300">{message}</div>}
        <div className="space-y-3">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent"
          />
          <button onClick={submit} disabled={submitting || !token} className="w-full py-2 rounded bg-indigo-600 text-white">
            {submitting ? 'Submitting...' : 'Set new password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;


