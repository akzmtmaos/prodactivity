import React, { useState } from 'react';
import axios from 'axios';
import { Subtask } from '../../types/task';

interface AddSubtaskModalProps {
  taskId: number;
  isOpen: boolean;
  onClose: () => void;
  onAdded: (subtask: Subtask) => void;
}

const API_BASE_URL = 'http://192.168.56.1:8000/api';

const AddSubtaskModal: React.FC<AddSubtaskModalProps> = ({ taskId, isOpen, onClose, onAdded }) => {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  };

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Title is required');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post(`${API_BASE_URL}/subtasks/`, { task: taskId, title: trimmed }, { headers: getAuthHeaders() });
      onAdded(res.data);
      setTitle('');
      onClose();
    } catch (e: any) {
      setError('Failed to create subtask');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add Subtask</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
        </div>
        <div className="p-6 space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
              placeholder="Describe the subtask"
              autoFocus
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">Cancel</button>
          <button onClick={handleAdd} disabled={loading} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">
            {loading ? 'Adding...' : 'Add Subtask'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSubtaskModal;


