import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Subtask } from '../../types/task';

interface SubtaskModalProps {
  taskId: number;
  isOpen: boolean;
  initialSubtasks?: Subtask[];
  onClose: () => void;
  onChange?: (subtasks: Subtask[]) => void;
}

const API_BASE_URL = 'http://localhost:8000/api';

const SubtaskModal: React.FC<SubtaskModalProps> = ({ taskId, isOpen, initialSubtasks = [], onClose, onChange }) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSubtasks(initialSubtasks);
  }, [initialSubtasks, isOpen]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post(`${API_BASE_URL}/subtasks/`, { task: taskId, title }, { headers: getAuthHeaders() });
      const updated = [...subtasks, res.data];
      setSubtasks(updated);
      setNewTitle('');
      onChange && onChange(updated);
    } catch (e: any) {
      setError('Failed to add subtask');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (s: Subtask) => {
    try {
      const res = await axios.patch(`${API_BASE_URL}/subtasks/${s.id}/`, { completed: !s.completed }, { headers: getAuthHeaders() });
      const updated = subtasks.map(x => (x.id === s.id ? res.data : x));
      setSubtasks(updated);
      onChange && onChange(updated);
    } catch {}
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/subtasks/${id}/`, { headers: getAuthHeaders() });
      const updated = subtasks.filter(x => x.id !== id);
      setSubtasks(updated);
      onChange && onChange(updated);
    } catch {}
  };

  const incompleteCount = useMemo(() => subtasks.filter(s => !s.completed).length, [subtasks]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Manage Subtasks</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {/* Inline add removed; creation will be done via AddSubtaskModal */}

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
            {subtasks.length === 0 && (
              <div className="p-4 text-sm text-gray-600">No subtasks yet.</div>
            )}
            {subtasks.map((s) => (
              <div key={s.id} className="p-3 flex items-center gap-3">
                <input type="checkbox" checked={s.completed} onChange={() => handleToggle(s)} />
                <span className={`flex-1 ${s.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>{s.title}</span>
                <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline text-sm">Delete</button>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">{incompleteCount} remaining</span>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">Close</button>
        </div>
      </div>
    </div>
  );
};

export default SubtaskModal;


