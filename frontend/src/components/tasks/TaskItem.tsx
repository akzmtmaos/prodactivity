import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Task, Subtask } from '../../types/task';
import AddSubtaskModal from './AddSubtaskModal';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-400',
  low: 'bg-green-500',
};

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggleComplete, onEdit, onDelete }) => {
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(task.subtasks || []);

  const totalSubtasks = useMemo(() => localSubtasks.length, [localSubtasks]);
  const completedSubtasks = useMemo(() => localSubtasks.filter(s => s.completed).length, [localSubtasks]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const toggleSubtask = async (s: Subtask) => {
    try {
      const res = await axios.patch(`http://localhost:8000/api/subtasks/${s.id}/`, { completed: !s.completed }, { headers: getAuthHeaders() });
      setLocalSubtasks(prev => prev.map(x => (x.id === s.id ? res.data : x)));
    } catch (e) {}
  };

  const deleteSubtask = async (id: number) => {
    try {
      await axios.delete(`http://localhost:8000/api/subtasks/${id}/`, { headers: getAuthHeaders() });
      setLocalSubtasks(prev => prev.filter(x => x.id !== id));
    } catch (e) {}
  };

  return (
    <div className={`group p-4 mb-3 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition hover:shadow-md w-full`}>
      {/* Task row */}
      <div className="flex items-center gap-4">
        {/* Priority color bar */}
        <div className={`w-1.5 h-10 rounded-full mr-2 ${priorityColors[task.priority] || 'bg-gray-300'}`}></div>
        {/* Checkbox */}
        <input
          type="checkbox"
          className="h-5 w-5 text-indigo-600 focus:ring-indigo-200 focus:ring-2 border-gray-400 rounded-full cursor-pointer mr-2 bg-transparent checked:bg-indigo-600 checked:border-indigo-600 transition"
          checked={task.completed}
          onChange={() => onToggleComplete(task.id)}
        />
        {/* Task main info */}
        <div className="flex-1 min-w-0">
          <div className={`text-base font-semibold ${task.completed ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-white'}`}>{task.title}</div>
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
            <span className="text-xs text-indigo-500 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 rounded px-2 py-0.5">
              {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
            </span>
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

      {/* Subtasks on next line */}
      {isSubtasksOpen && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Subtasks:</span>
            <span className="text-xs text-gray-500">({completedSubtasks}/{totalSubtasks} completed)</span>
          </div>
          {localSubtasks.length === 0 ? (
            <div className="text-sm text-gray-500">No subtasks yet.</div>
          ) : (
            <ul className="space-y-2">
              {localSubtasks.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  <input type="checkbox" checked={s.completed} onChange={() => toggleSubtask(s)} />
                  <span className={`flex-1 text-sm ${s.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>{s.title}</span>
                  <button onClick={() => deleteSubtask(s.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </li>
              ))}
            </ul>
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
  );
};

export default TaskItem; 