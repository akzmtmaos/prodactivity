import React from 'react';
import { X } from 'lucide-react';
import { Task } from '../../types/task';
import { getTodayDate } from '../../utils/dateUtils';

interface TaskFormProps {
  task?: Task;
  onSubmit: (task: Omit<Task, 'id'>) => void;
  onCancel: () => void;
  existingCategories?: string[];
  preSelectedCategory?: string;
}

const TaskForm: React.FC<TaskFormProps> = ({ task, onSubmit, onCancel, existingCategories = [], preSelectedCategory }) => {
  // Helper function to ensure due date is not in the past
  const getValidDueDate = (taskDueDate?: string) => {
    if (!taskDueDate) return getTodayDate();
    
    const dueDate = new Date(taskDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If the task's due date is in the past, use today's date instead
    if (dueDate < today) {
      return getTodayDate();
    }
    
    return taskDueDate;
  };

  const [formData, setFormData] = React.useState<Omit<Task, 'id'>>({
    title: task?.title || '',
    description: task?.description || '',
    dueDate: getValidDueDate(task?.dueDate),
    priority: task?.priority || 'medium',
    completed: task?.completed || false,
    category: task?.category || 'other',
    task_category: task?.task_category || preSelectedCategory || ''
  });
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isNewCategory, setIsNewCategory] = React.useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!formData.dueDate) {
      setFormError('Due date is required.');
      return;
    }
    
    // Check if due date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(formData.dueDate);
    if (dueDate < today) {
      setFormError('Cannot select a due date in the past.');
      return;
    }
    
    // Submit form data (already guaranteed to be Omit<Task, 'id'> type)
    onSubmit(formData);
  };

  const inputClass =
    'w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-[#333333] rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-[#252525] text-gray-900 dark:text-white';
  const labelClass = 'block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onCancel} aria-hidden />
      <div
        className="relative bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-[#333333]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {task ? 'Edit Task' : 'Add New Task'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-3">
          {formError && (
            <div className="mb-3 p-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md">
              {formError}
            </div>
          )}
          <div className="mb-3">
            <label htmlFor="title" className={labelClass}>Title</label>
            <input
              type="text"
              id="title"
              name="title"
              required
              className={inputClass}
              value={formData.title}
              onChange={handleInputChange}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="description" className={labelClass}>Description</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className={`${inputClass} resize-none`}
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>
          <div className="mb-3 flex gap-2">
            <div className="w-1/2">
              <label htmlFor="dueDate" className={labelClass}>Due Date</label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                required
                min={getTodayDate()}
                className={inputClass}
                value={formData.dueDate}
                onChange={handleInputChange}
              />
            </div>
            <div className="w-1/2">
              <label htmlFor="priority" className={labelClass}>Priority</label>
              <select
                id="priority"
                name="priority"
                className={inputClass}
                value={formData.priority}
                onChange={handleInputChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">XP varies by priority</p>
            </div>
          </div>

          {!preSelectedCategory && (
            <div className="mb-3">
              <label htmlFor="task_category" className={labelClass}>Task Category</label>
              <div className="flex gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={() => setIsNewCategory(false)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    !isNewCategory
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-[#2d2d2d] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#252525]'
                  }`}
                >
                  Existing
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewCategory(true)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    isNewCategory
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-[#2d2d2d] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#252525]'
                  }`}
                >
                  New
                </button>
              </div>
              {!isNewCategory ? (
                <select
                  id="task_category"
                  name="task_category"
                  className={inputClass}
                  value={formData.task_category}
                  onChange={handleInputChange}
                >
                  <option value="">Select category...</option>
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="task_category"
                  name="task_category"
                  placeholder="New category name"
                  className={inputClass}
                  value={formData.task_category}
                  onChange={handleInputChange}
                />
              )}
            </div>
          )}

          {preSelectedCategory && (
            <div className="mb-3 p-2.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-md">
              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{preSelectedCategory}</span>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Task will be added to this category</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors"
            >
              {task ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm; 