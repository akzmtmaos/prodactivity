import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Subtask } from '../../types/task';
import { supabase } from '../../lib/supabase';

interface SubtaskModalProps {
  taskId: number;
  isOpen: boolean;
  initialSubtasks?: Subtask[];
  onClose: () => void;
  onChange?: (subtasks: Subtask[]) => void;
}

const API_BASE_URL = 'http://192.168.56.1:8000/api';

const SubtaskModal: React.FC<SubtaskModalProps> = ({ taskId, isOpen, initialSubtasks = [], onClose, onChange }) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSubtasks();
    } else {
      setSubtasks(initialSubtasks);
    }
  }, [initialSubtasks, isOpen, taskId]);

  const fetchSubtasks = async () => {
    try {
      console.log('Fetching subtasks from Supabase for task:', taskId);
      
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Supabase error:', error);
        setError('Failed to load subtasks');
        return;
      }
      
      console.log('📋 Subtasks loaded from Supabase:', data);
      console.log('📋 Setting subtasks state with:', data?.map(s => ({ id: s.id, title: s.title, completed: s.completed })));
      setSubtasks(data || []);
    } catch (err) {
      console.error('Error fetching subtasks:', err);
      setError('Failed to load subtasks');
    }
  };

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
      
      // Get current user ID
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const userId = user?.id || 11; // Fallback to your user ID
      
      const { data, error } = await supabase
        .from('subtasks')
        .insert([{
          task_id: taskId,
          title: title,
          completed: false,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        setError(`Failed to add subtask: ${error.message}`);
        return;
      }
      
      console.log('Subtask added successfully:', data);
      setNewTitle('');
      
      // Refresh subtasks from Supabase
      await fetchSubtasks();
    } catch (e: any) {
      console.error('Error adding subtask:', e);
      setError('Failed to add subtask');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (s: Subtask) => {
    try {
      console.log('🔄 Toggling subtask:', s.id, s.title, 'from', s.completed, 'to', !s.completed);
      
      const { data, error } = await supabase
        .from('subtasks')
        .update({ 
          completed: !s.completed,
          updated_at: new Date().toISOString()
        })
        .eq('id', s.id)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        return;
      }
      
      console.log('✅ Subtask toggled successfully:', data);
      
      // Refresh subtasks from Supabase
      await fetchSubtasks();
    } catch (err) {
      console.error('Error toggling subtask:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error('Supabase error:', error);
        return;
      }
      
      // Refresh subtasks from Supabase
      await fetchSubtasks();
    } catch (err) {
      console.error('Error deleting subtask:', err);
    }
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


