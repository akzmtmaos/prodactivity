import React, { useState } from 'react';
import { format, isValid } from 'date-fns';
import { RecurringSchedule } from '../../types/schedule';
import ReactDOM from 'react-dom';

interface AddRecurringScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSchedule: (schedule: Omit<RecurringSchedule, 'id'>) => void;
  editingSchedule?: RecurringSchedule | null;
}

const AddRecurringScheduleModal: React.FC<AddRecurringScheduleModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddSchedule, 
  editingSchedule 
}) => {
  const [schedule, setSchedule] = useState<Omit<RecurringSchedule, 'id'>>({
    title: editingSchedule?.title || '',
    startDate: editingSchedule?.startDate ? new Date(editingSchedule.startDate) : new Date(),
    endDate: editingSchedule?.endDate ? new Date(editingSchedule.endDate) : undefined,
    startTime: editingSchedule?.startTime || '09:00',
    endTime: editingSchedule?.endTime || '10:00',
    category: editingSchedule?.category || 'study',
    description: editingSchedule?.description || '',
    frequency: editingSchedule?.frequency || 'weekly',
    interval: editingSchedule?.interval || 1,
    daysOfWeek: editingSchedule?.daysOfWeek || [],
    dayOfMonth: editingSchedule?.dayOfMonth || 1,
    isActive: editingSchedule?.isActive ?? true,
  });

  const [errors, setErrors] = useState<{
    title?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    frequency?: string;
    interval?: string;
  }>({});

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!schedule.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!schedule.startDate || !isValid(schedule.startDate)) {
      newErrors.startDate = 'Please enter a valid start date';
    }

    if (schedule.endDate && (!isValid(schedule.endDate) || schedule.endDate < schedule.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (!schedule.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!schedule.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (schedule.startTime && schedule.endTime) {
      const start = new Date(`2000-01-01T${schedule.startTime}`);
      const end = new Date(`2000-01-01T${schedule.endTime}`);
      if (end <= start) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    if (schedule.interval < 1) {
      newErrors.interval = 'Interval must be at least 1';
    }

    if (schedule.frequency === 'weekly' && (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0)) {
      newErrors.frequency = 'Please select at least one day of the week';
    }

    if (schedule.frequency === 'monthly' && (!schedule.dayOfMonth || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31)) {
      newErrors.frequency = 'Day of month must be between 1 and 31';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      onAddSchedule(schedule);
      setSchedule({
        title: '',
        startDate: new Date(),
        endDate: undefined,
        startTime: '09:00',
        endTime: '10:00',
        category: 'study',
        description: '',
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [],
        dayOfMonth: 1,
        isActive: true,
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error adding recurring schedule:', error);
      alert('Failed to add recurring schedule. Please try again.');
    }
  };

  const handleDayToggle = (dayIndex: number) => {
    const currentDays = schedule.daysOfWeek || [];
    const newDays = currentDays.includes(dayIndex)
      ? currentDays.filter(d => d !== dayIndex)
      : [...currentDays, dayIndex];
    setSchedule({ ...schedule, daysOfWeek: newDays });
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingSchedule ? 'Edit Recurring Schedule' : 'Add Recurring Schedule'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Basic Information</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
              <input
                type="text"
                value={schedule.title}
                onChange={(e) => {
                  setSchedule({...schedule, title: e.target.value});
                  setErrors({...errors, title: undefined});
                }}
                className={`mt-1 block w-full p-2 border ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500`}
                required
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select
                value={schedule.category}
                onChange={(e) => setSchedule({...schedule, category: e.target.value as any})}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="study">Study</option>
                <option value="assignment">Assignment</option>
                <option value="exam">Exam</option>
                <option value="meeting">Meeting</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
              <input
                type="date"
                value={schedule.startDate ? format(schedule.startDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  if (isValid(date)) {
                    setSchedule({...schedule, startDate: date});
                    setErrors({...errors, startDate: undefined});
                  }
                }}
                className={`mt-1 block w-full p-2 border ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500`}
                required
                min={format(new Date(), 'yyyy-MM-dd')}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date (Optional)</label>
              <input
                type="date"
                value={schedule.endDate ? format(schedule.endDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined;
                  if (!date || isValid(date)) {
                    setSchedule({...schedule, endDate: date});
                    setErrors({...errors, endDate: undefined});
                  }
                }}
                className={`mt-1 block w-full p-2 border ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500`}
                min={schedule.startDate ? format(schedule.startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
              <input
                type="time"
                value={schedule.startTime}
                onChange={(e) => {
                  setSchedule({...schedule, startTime: e.target.value});
                  setErrors({...errors, startTime: undefined});
                }}
                className={`mt-1 block w-full p-2 border ${
                  errors.startTime ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500`}
                required
              />
              {errors.startTime && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startTime}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
              <input
                type="time"
                value={schedule.endTime}
                onChange={(e) => {
                  setSchedule({...schedule, endTime: e.target.value});
                  setErrors({...errors, endTime: undefined});
                }}
                className={`mt-1 block w-full p-2 border ${
                  errors.endTime ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500`}
                required
              />
              {errors.endTime && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endTime}</p>
              )}
            </div>

            {/* Recurrence Settings */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Recurrence Settings</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Frequency</label>
              <select
                value={schedule.frequency}
                onChange={(e) => setSchedule({...schedule, frequency: e.target.value as any})}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Every</label>
              <div className="mt-1 flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={schedule.interval}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 1) {
                      setSchedule({...schedule, interval: value});
                      setErrors({...errors, interval: undefined});
                    }
                  }}
                  className={`block w-20 p-2 border ${
                    errors.interval ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500`}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {schedule.frequency === 'daily' && 'day(s)'}
                  {schedule.frequency === 'weekly' && 'week(s)'}
                  {schedule.frequency === 'monthly' && 'month(s)'}
                  {schedule.frequency === 'yearly' && 'year(s)'}
                </span>
              </div>
              {errors.interval && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.interval}</p>
              )}
            </div>

            {/* Weekly specific options */}
            {schedule.frequency === 'weekly' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Days of the week
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {dayNames.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDayToggle(index)}
                      className={`p-2 text-sm rounded-md border transition-colors ${
                        (schedule.daysOfWeek || []).includes(index)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
                {errors.frequency && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.frequency}</p>
                )}
              </div>
            )}

            {/* Monthly specific options */}
            {schedule.frequency === 'monthly' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Day of month
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={schedule.dayOfMonth || 1}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 1 && value <= 31) {
                      setSchedule({...schedule, dayOfMonth: value});
                    }
                  }}
                  className="mt-1 block w-32 p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={schedule.description}
                onChange={(e) => setSchedule({...schedule, description: e.target.value})}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Optional description for this recurring schedule..."
              />
            </div>

            {/* Active status */}
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={schedule.isActive}
                  onChange={(e) => setSchedule({...schedule, isActive: e.target.checked})}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Active (will generate events automatically)
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
            >
              {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddRecurringScheduleModal;
