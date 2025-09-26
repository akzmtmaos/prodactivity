import React from 'react';
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 mx-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {task ? 'Edit Task' : 'Add New Task'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
              {formError}
            </div>
          )}
          {/* Title */}
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 py-3 px-4 focus:shadow-indigo-200 dark:focus:shadow-indigo-900"
              value={formData.title}
              onChange={handleInputChange}
            />
          </div>
          
          {/* Description */}
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 py-3 px-4 focus:shadow-indigo-200 dark:focus:shadow-indigo-900 resize-none"
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>
          
          {/* Due Date & Priority (same line) */}
          <div className="mb-4 flex gap-3">
            <div className="w-1/2">
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Due Date
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                required
                min={getTodayDate()}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 py-3 px-4 focus:shadow-indigo-200 dark:focus:shadow-indigo-900"
                value={formData.dueDate}
                onChange={handleInputChange}
              />
            </div>
            <div className="w-1/2">
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Priority
              </label>
              <div className="relative">
                <select
                  id="priority"
                  name="priority"
                  className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 py-3 px-4 pr-10 focus:shadow-indigo-200 dark:focus:shadow-indigo-900 appearance-none"
                  value={formData.priority}
                  onChange={handleInputChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                {/* Chevron icon for dropdown */}
                <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.355a.75.75 0 111.02 1.1l-4 3.62a.75.75 0 01-1.02 0l-4-3.62a.75.75 0 01.02-1.1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Task Category - Only show if no category is pre-selected */}
          {!preSelectedCategory && (
            <div className="mb-4">
              <label htmlFor="task_category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Task Category
              </label>
              <div className="mt-1">
                <div className="flex space-x-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setIsNewCategory(false)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      !isNewCategory
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Select Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewCategory(true)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      isNewCategory
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Create New
                  </button>
                </div>
                
                {!isNewCategory ? (
                  <div className="relative">
                    <select
                      id="task_category"
                      name="task_category"
                      className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 py-3 px-4 pr-10 focus:shadow-indigo-200 dark:focus:shadow-indigo-900 appearance-none"
                      value={formData.task_category}
                      onChange={handleInputChange}
                    >
                      <option value="">Select a category...</option>
                      {existingCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {/* Chevron icon */}
                    <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.355a.75.75 0 111.02 1.1l-4 3.62a.75.75 0 01-1.02 0l-4-3.62a.75.75 0 01.02-1.1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    id="task_category"
                    name="task_category"
                    placeholder="Enter new category (e.g., CAPSTONE, Math, ComProg2)"
                    className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 py-3 px-4 focus:shadow-indigo-200 dark:focus:shadow-indigo-900"
                    value={formData.task_category}
                    onChange={handleInputChange}
                  />
                )}
              </div>
            </div>
          )}
          
          {/* Show pre-selected category info */}
          {preSelectedCategory && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <div className="mt-1 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg">
                <span className="text-indigo-700 dark:text-indigo-300 font-medium">{preSelectedCategory}</span>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  Task will be added to this category
                </p>
              </div>
            </div>
          )}
          
          {/* Completed (only show in edit mode) */}
          {task && (
            <div className="flex items-center mb-4">
              <input
                id="completed"
                name="completed"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={formData.completed}
                onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
              />
              <label htmlFor="completed" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Mark as completed
              </label>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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