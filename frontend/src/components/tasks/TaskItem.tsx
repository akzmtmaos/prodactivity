import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { Task, Subtask } from '../../types/task';
import AddSubtaskModal from './AddSubtaskModal';
import TaskActivityModal from './TaskActivityModal';
import { supabase } from '../../lib/supabase';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onTaskCompleted?: (completedTask: any) => void;
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-400',
  low: 'bg-green-500',
};

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggleComplete, onEdit, onDelete, onTaskCompleted }) => {
  // Function to check if task is overdue
  const isOverdue = () => {
    if (task.completed) return false; // Don't show late for completed tasks
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  // Function to generate consistent hash for category colors
  const getCategoryColorHash = (category: string) => {
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      const char = category.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };

  // Function to get category color styling with randomized but consistent colors
  const getCategoryColor = (category: string) => {
    // Array of color combinations for categories
    const colorCombinations = [
      { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-900 dark:text-blue-100' },
      { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-900 dark:text-green-100' },
      { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-900 dark:text-purple-100' },
      { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-900 dark:text-orange-100' },
      { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-900 dark:text-pink-100' },
      { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-900 dark:text-indigo-100' },
      { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-900 dark:text-teal-100' },
      { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-900 dark:text-red-100' },
      { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-900 dark:text-yellow-100' },
      { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-900 dark:text-cyan-100' }
    ];

    const hash = getCategoryColorHash(category);
    const colorIndex = hash % colorCombinations.length;
    return colorCombinations[colorIndex];
  };
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(task.subtasks || []);

  const totalSubtasks = useMemo(() => localSubtasks.length, [localSubtasks]);
  const completedSubtasks = useMemo(() => localSubtasks.filter(s => s.completed).length, [localSubtasks]);

  // Fetch subtasks from Supabase when component mounts
  useEffect(() => {
    const fetchSubtasks = async () => {
      try {
        console.log('📋 TaskItem: Fetching subtasks for task:', task.id);
        
        const { data, error } = await supabase
          .from('subtasks')
          .select('*')
          .eq('task_id', task.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Supabase error:', error);
          return;
        }
        
        console.log('📋 TaskItem: Subtasks loaded from Supabase:', data);
        setLocalSubtasks(data || []);
      } catch (err) {
        console.error('Error fetching subtasks in TaskItem:', err);
      }
    };

    fetchSubtasks();
  }, [task.id]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleToggleComplete = async () => {
    console.log('TaskItem handleToggleComplete called for task:', task.title);
    console.log('Task completed status:', task.completed);
    console.log('Task can_be_completed:', task.can_be_completed);
    console.log('Task evidence_uploaded:', task.evidence_uploaded);
    
    // If task is not completed and cannot be completed, show activity modal
    if (!task.completed && (task.can_be_completed === false || !task.evidence_uploaded)) {
      console.log('Showing activity modal instead of toggling');
      setIsActivityModalOpen(true);
      return;
    }
    
    // Proceed with normal toggle
    console.log('Proceeding with normal toggle');
    onToggleComplete(task.id);
  };

  const handleActivityLogged = () => {
    // Task completion is now handled by onTaskCompleted callback
    // No need to refresh the page
  };

  const openActivityModal = () => {
    setIsActivityModalOpen(true);
  };

  const toggleSubtask = async (s: Subtask) => {
    try {
      console.log('🔄 TaskItem: Toggling subtask:', s.id, s.title, 'from', s.completed, 'to', !s.completed);
      
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
      
      console.log('✅ TaskItem: Subtask toggled successfully:', data);
      setLocalSubtasks(prev => prev.map(x => (x.id === s.id ? data : x)));
      
      // Award XP for subtask completion (only when completing, not uncompleting)
      if (!s.completed && data.completed) {
        await awardSubtaskXP(s.id, s.title);
      }
      
      // Update productivity log when subtask is completed - this will update Today's Productivity in Progress.tsx
      if (!s.completed && data.completed) {
        await updateProductivityLog();
        
        // Trigger progress refresh for real-time updates in Progress.tsx
        window.dispatchEvent(new CustomEvent('subtaskCompleted', { 
          detail: { subtaskId: s.id, subtaskTitle: s.title, taskId: task.id } 
        }));
      }
    } catch (e) {
      console.error('Error toggling subtask in TaskItem:', e);
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
          task_id: task.id, // Link to parent task
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

  // Update productivity log (similar to Tasks.tsx)
  const updateProductivityLog = async () => {
    try {
      console.log('🔄 TaskItem: Updating productivity log');
      
      // Get current user ID
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const userId = user?.id || 11;
      
      const today = new Date().toLocaleDateString('en-CA');
      
      // Get today's productivity log or create new one
      const { data: existingLog, error: fetchError } = await supabase
        .from('productivity_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('period_type', 'daily')
        .eq('period_start', today)
        .eq('period_end', today)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching productivity log:', fetchError);
        return;
      }
      
      // Get tasks for today
      const { data: todayTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, completed, due_date')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .eq('due_date', today);
      
      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        return;
      }
      
      const totalTasks = (todayTasks || []).length;
      const completedTasks = (todayTasks || []).filter(task => task.completed).length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Determine productivity status
      let status = 'Low Productive';
      if (completionRate >= 90) status = 'Highly Productive';
      else if (completionRate >= 70) status = 'Productive';
      else if (completionRate >= 40) status = 'Moderately Productive';
      
      if (existingLog) {
        // Update existing log
        const { error: updateError } = await supabase
          .from('productivity_logs')
          .update({
            completion_rate: completionRate,
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            status: status,
            logged_at: new Date().toISOString()
          })
          .eq('id', existingLog.id);
        
        if (updateError) {
          console.error('Error updating productivity log:', updateError);
        } else {
          console.log('✅ TaskItem: Productivity log updated successfully');
        }
      } else {
        // Create new log
        const { error: insertError } = await supabase
          .from('productivity_logs')
          .insert([{
            user_id: userId,
            period_type: 'daily',
            period_start: today,
            period_end: today,
            completion_rate: completionRate,
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            status: status,
            logged_at: new Date().toISOString()
          }]);
        
        if (insertError) {
          console.error('Error creating productivity log:', insertError);
        } else {
          console.log('✅ TaskItem: Productivity log created successfully');
        }
      }
    } catch (err) {
      console.error('Error in TaskItem updateProductivityLog:', err);
    }
  };

  const deleteSubtask = async (id: number) => {
    try {
      console.log('🗑️ TaskItem: Deleting subtask:', id);
      
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
      
      console.log('✅ TaskItem: Subtask deleted successfully');
      setLocalSubtasks(prev => prev.filter(x => x.id !== id));
    } catch (e) {
      console.error('Error deleting subtask in TaskItem:', e);
    }
  };

  return (
    <>
      <div className={`group p-4 mb-3 rounded-lg shadow-sm transition hover:shadow-md w-full ${
        isOverdue() 
          ? 'bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800' 
          : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'
      }`}>
        {/* Task row */}
        <div className="flex items-center gap-4">
          {/* Priority color bar */}
          <div className={`w-1.5 h-10 rounded-full mr-2 ${priorityColors[task.priority] || 'bg-gray-300'}`}></div>
          {/* Checkbox */}
          <input
            type="checkbox"
            className="h-5 w-5 text-indigo-600 focus:ring-indigo-200 focus:ring-2 border-gray-400 rounded-full cursor-pointer mr-2 bg-transparent checked:bg-indigo-600 checked:border-indigo-600 transition"
            checked={task.completed}
            onChange={handleToggleComplete}
          />
          {/* Task main info */}
          <div className="flex-1 min-w-0">
            <div className={`text-base font-semibold ${task.completed ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-white'}`}>{task.title}</div>
            
            {/* Activity/Evidence requirement indicator */}
            {/* Temporarily disabled until migration is applied */}
            {/* {!task.completed && !task.evidence_uploaded && (
              <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-orange-600 dark:text-orange-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                      Evidence required to complete task
                    </span>
                  </div>
                  <button
                    onClick={openActivityModal}
                    className="text-xs bg-orange-600 text-white px-3 py-1 rounded-md hover:bg-orange-700 transition-colors"
                  >
                    Add Evidence
                  </button>
                </div>
              </div>
            )} */}
            
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {task.description && (
                <span className={`text-sm ${task.completed ? 'text-gray-300 line-through' : 'text-gray-500 dark:text-gray-400'}`}>
                  {task.description.length > 80 ? `${task.description.substring(0, 80)}...` : task.description}
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Due: {new Date(task.dueDate).toLocaleDateString()}
              </span>
              <span className={`flex items-center text-xs font-medium ${
                task.priority === 'high'
                  ? 'text-red-500'
                  : task.priority === 'medium'
                  ? 'text-yellow-500'
                  : 'text-green-500'
              }`}>
                <span className={`w-2 h-2 rounded-full mr-1 ${priorityColors[task.priority] || 'bg-gray-300'}`}></span>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
              {isOverdue() && (
                <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-0.5 flex items-center font-medium animate-pulse">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Late
                </span>
              )}
              {task.task_category && (
                <span className={`text-xs rounded px-2 py-0.5 ${getCategoryColor(task.task_category).bg} ${getCategoryColor(task.task_category).text}`}>
                  {task.task_category}
                </span>
              )}
              
              {/* Activity status indicators */}
              {!task.completed && (
                <>
                  {task.has_activity && (
                    <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-2 py-0.5 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Worked On
                    </span>
                  )}
                  {task.time_spent_minutes && task.time_spent_minutes > 0 && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-0.5">
                      {task.time_spent_minutes}m
                    </span>
                  )}
                  {task.evidence_uploaded && (
                    <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded px-2 py-0.5 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      Evidence
                    </span>
                  )}
                  {task.can_be_completed === false && (
                    <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded px-2 py-0.5 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Needs Evidence
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          {/* Action icons */}
          <div className="flex items-center gap-2">
            <button
              className="relative p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setIsSubtasksOpen(prev => !prev)}
              title="Show subtasks"
            >
              <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h6" />
              </svg>
              {totalSubtasks > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">
                  {completedSubtasks}/{totalSubtasks}
                </span>
              )}
            </button>
            <button
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setIsAddSubtaskOpen(true)}
              title="Add subtask"
            >
              <svg className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              className="p-2 rounded hover:bg-indigo-100 dark:hover:bg-gray-700"
              onClick={() => onEdit(task)}
              title="Edit"
            >
              <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h2v2a2 2 0 002 2h2a2 2 0 002-2v-2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2v-2a2 2 0 00-2-2h-2a2 2 0 00-2 2v2H7a2 2 0 00-2 2v2a2 2 0 002 2h2z" />
              </svg>
            </button>
            <button
              className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900"
              onClick={() => onDelete(task.id)}
              title="Delete"
            >
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Enhanced Subtasks Section */}
        {isSubtasksOpen && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Subtask Header with Progress */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Subtasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {completedSubtasks}/{totalSubtasks} completed
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsAddSubtaskOpen(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
                title="Add subtask"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add
              </button>
            </div>


            {/* Subtasks List */}
            {localSubtasks.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No subtasks yet</p>
                <button
                  onClick={() => setIsAddSubtaskOpen(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                >
                  Add your first subtask
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {localSubtasks.map((s, index) => (
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
                        onChange={() => toggleSubtask(s)}
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
                      onClick={() => deleteSubtask(s.id)} 
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
        )}

        {/* Add Subtask modal */}
        <AddSubtaskModal
          taskId={task.id}
          isOpen={isAddSubtaskOpen}
          onClose={() => setIsAddSubtaskOpen(false)}
          onAdded={(s) => {
            setLocalSubtasks(prev => [...prev, s]);
            setIsSubtasksOpen(true);
          }}
        />
      </div>

      {/* Activity Modal */}
      <TaskActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        taskId={task.id}
        taskTitle={task.title}
        onActivityLogged={handleActivityLogged}
        onTaskCompleted={onTaskCompleted}
      />
    </>
  );
};

export default TaskItem; 