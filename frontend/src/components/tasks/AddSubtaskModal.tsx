import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Subtask } from '../../types/task';
import { supabase } from '../../lib/supabase';

interface AddSubtaskModalProps {
  taskId: number;
  isOpen: boolean;
  onClose: () => void;
  onAdded: (subtask: Subtask) => void;
}

const AddSubtaskModal: React.FC<AddSubtaskModalProps> = ({ taskId, isOpen, onClose, onAdded }) => {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Title is required');
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // Get current user ID
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const userId = user?.id || 11; // Fallback to your user ID

      const { data, error } = await supabase
        .from('subtasks')
        .insert([{
          task_id: taskId,
          title: trimmed,
          completed: false,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        setError(`Failed to create subtask: ${error.message}`);
        return;
      }

      console.log('Subtask created successfully in Supabase:', data);
      onAdded(data);
      setTitle('');
      onClose();
    } catch (e: any) {
      console.error('Error creating subtask:', e);
      setError('Failed to create subtask');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop – neutral, same as Create Notebook/Deck */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-[#333333]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Add Subtask
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleAdd} className="px-4 py-3">
          {error && (
            <div className="mb-3 p-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label
              htmlFor="subtask-title"
              className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1.5"
            >
              Subtask Title
            </label>
            <input
              type="text"
              id="subtask-title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(null); }}
              placeholder="Enter subtask title"
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-[#333333] rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-[#252525] text-gray-900 dark:text-white"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-2.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Subtask'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSubtaskModal;
