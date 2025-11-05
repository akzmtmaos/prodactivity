import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Subtask } from '../../types/task';
import { supabase } from '../../lib/supabase';
import { API_BASE_URL } from '../../config/api';

interface SubtaskModalProps {
  taskId: number;
  isOpen: boolean;
  initialSubtasks?: Subtask[];
  onClose: () => void;
  onChange?: (subtasks: Subtask[]) => void;
}

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
      
      // Award XP for subtask completion (only when completing, not uncompleting)
      if (!s.completed && data.completed) {
        await awardSubtaskXP(s.id, s.title);
        
        // Trigger progress refresh for real-time updates in Progress.tsx
        window.dispatchEvent(new CustomEvent('subtaskCompleted', { 
          detail: { subtaskId: s.id, subtaskTitle: s.title, taskId: taskId } 
        }));
      }
      
      // Refresh subtasks from Supabase
      await fetchSubtasks();
    } catch (err) {
      console.error('Error toggling subtask:', err);
    }
  };

  // Award XP for subtask completion
  const awardSubtaskXP = async (subtaskId: number, subtaskTitle: string) => {
    try {
      // Get current user ID
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const userId = user?.id || 11;
      
      console.log('🎮 Awarding XP for subtask completion:', subtaskTitle);
      
      // Award 2 XP for subtask completion
      const xpAmount = 2;
      
      const { error: xpError } = await supabase
        .from('xp_logs')
        .insert([{
          user_id: userId,
          task_id: taskId, // Link to parent task
          xp_amount: xpAmount,
          source: 'subtask_completion',
          description: `Completed subtask: ${subtaskTitle}`,
          created_at: new Date().toISOString()
        }]);
      
      if (xpError) {
        console.error('❌ Error creating subtask XP log:', xpError);
      } else {
        console.log(`✅ Subtask XP awarded: +${xpAmount} XP for "${subtaskTitle}"`);
        // Show toast notification for XP
        window.dispatchEvent(new CustomEvent('subtaskCompleted', { 
          detail: { subtaskId, subtaskTitle, xpAmount } 
        }));
      }
    } catch (err) {
      console.error('Error awarding subtask XP:', err);
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
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          {/* Subtasks List with Enhanced Design */}
          <div className="max-h-80 overflow-y-auto">
            {subtasks.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No subtasks yet</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Add subtasks to break down this task into smaller steps</p>
              </div>
            ) : (
              <div className="space-y-2">
                {subtasks.map((s, index) => (
                  <div 
                    key={s.id} 
                    className={`group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                      s.completed 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Enhanced Checkbox */}
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={s.completed} 
                        onChange={() => handleToggle(s)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer transition-all duration-200"
                      />
                      {s.completed && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Subtask Title with XP Badge */}
                    <div className="flex-1 flex items-center gap-2">
                      <span className={`text-sm transition-all duration-200 ${
                        s.completed 
                          ? 'line-through text-gray-400 dark:text-gray-500' 
                          : 'text-gray-800 dark:text-gray-100'
                      }`}>
                        {s.title}
                      </span>
                      {s.completed && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          +2 XP
                        </div>
                      )}
                    </div>

                    {/* Delete Button */}
                    <button 
                      onClick={() => handleDelete(s.id)} 
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-all duration-200"
                      title="Delete subtask"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
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


