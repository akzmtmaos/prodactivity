import React, { useState, useEffect } from 'react';
import { format, isValid } from 'date-fns';
import { ScheduleEvent, PastEvent } from '../../types/schedule';
import { Repeat, X } from 'lucide-react';
import ReactDOM from 'react-dom';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (event: Omit<ScheduleEvent, 'id'>) => void;
  recurringEvent?: PastEvent | null;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onAddEvent, recurringEvent }) => {
  const [newEvent, setNewEvent] = useState<Omit<ScheduleEvent, 'id'>>({
    title: '',
    date: new Date(),
    endDate: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    category: 'study',
    description: '',
  });

  // Pre-fill form when recurring event is provided
  useEffect(() => {
    if (recurringEvent) {
      setNewEvent({
        title: recurringEvent.title,
        date: new Date(),
        endDate: new Date(),
        startTime: recurringEvent.startTime,
        endTime: recurringEvent.endTime,
        category: recurringEvent.category,
        description: recurringEvent.description || '',
      });
    } else {
      setNewEvent({
        title: '',
        date: new Date(),
        endDate: new Date(),
        startTime: '09:00',
        endTime: '10:00',
        category: 'study',
        description: '',
      });
    }
  }, [recurringEvent, isOpen]);

  const [errors, setErrors] = useState<{
    title?: string;
    date?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    // Title validation
    if (!newEvent.title.trim()) {
      newErrors.title = 'Title is required';
    }

    // Date validation
    if (!newEvent.date || !isValid(newEvent.date)) {
      newErrors.date = 'Please enter a valid date';
    } else {
      // Check if date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (newEvent.date < today) {
        newErrors.date = 'Cannot select a date in the past';
      }
    }

    // End Date validation
    if (!newEvent.endDate || !isValid(newEvent.endDate)) {
      newErrors.endDate = 'Please enter a valid end date';
    } else {
      // Check if end date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (newEvent.endDate < today) {
        newErrors.endDate = 'Cannot select a date in the past';
      } else if (newEvent.endDate < newEvent.date) {
        newErrors.endDate = 'End date cannot be before start date';
      }
    }

    // Time validation
    if (!newEvent.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!newEvent.endTime) {
      newErrors.endTime = 'End time is required';
    }

    // Check if end time is after start time
    if (newEvent.startTime && newEvent.endTime) {
      const start = new Date(`2000-01-01T${newEvent.startTime}`);
      const end = new Date(`2000-01-01T${newEvent.endTime}`);
      if (end <= start) {
        newErrors.endTime = 'End time must be after start time';
      }
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
      onAddEvent(newEvent);
      setNewEvent({
        title: '',
        date: new Date(),
        endDate: new Date(),
        startTime: '09:00',
        endTime: '10:00',
        category: 'study',
        description: '',
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event. Please try again.');
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const date = new Date(e.target.value);
      if (isValid(date)) {
        setNewEvent({
          ...newEvent,
          date,
          endDate: newEvent.endDate ? (date > newEvent.endDate ? date : newEvent.endDate) : date
        });
        setErrors({...errors, date: undefined});
      } else {
        setErrors({...errors, date: 'Please enter a valid date'});
      }
    } catch (error) {
      setErrors({...errors, date: 'Please enter a valid date'});
    }
  };
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const endDate = new Date(e.target.value);
      if (isValid(endDate)) {
        setNewEvent({...newEvent, endDate});
        setErrors({...errors, endDate: undefined});
      } else {
        setErrors({...errors, endDate: 'Please enter a valid end date'});
      }
    } catch (error) {
      setErrors({...errors, endDate: 'Please enter a valid end date'});
    }
  };

  if (!isOpen) return null;

  const inputBase = 'block w-full px-2.5 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-[#252525] text-gray-900 dark:text-white';
  const inputError = 'border-red-500 dark:border-red-500';
  const inputNormal = 'border-gray-300 dark:border-[#333333]';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl w-full max-w-2xl mx-4 border border-gray-200 dark:border-[#333333] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-[#333333] flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 truncate">
              {recurringEvent ? (
                <>
                  <Repeat className="h-4 w-4 text-purple-500 flex-shrink-0" />
                  <span className="truncate">Recur: {recurringEvent.title}</span>
                </>
              ) : (
                'Add New Event'
              )}
            </h2>
            {recurringEvent && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Based on previous event</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d] flex-shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-3 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Title</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => {
                  setNewEvent({ ...newEvent, title: e.target.value });
                  setErrors({ ...errors, title: undefined });
                }}
                className={`${inputBase} ${errors.title ? inputError : inputNormal}`}
                required
              />
              {errors.title && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Category</label>
              <select
                value={newEvent.category}
                onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value as any })}
                className={`${inputBase} ${inputNormal}`}
              >
                <option value="study">Study</option>
                <option value="assignment">Assignment</option>
                <option value="exam">Exam</option>
                <option value="meeting">Meeting</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Start Date</label>
              <input
                type="date"
                value={newEvent.date ? format(new Date(newEvent.date), 'yyyy-MM-dd') : ''}
                onChange={handleDateChange}
                className={`${inputBase} ${errors.date ? inputError : inputNormal}`}
                required
                min={format(new Date(), 'yyyy-MM-dd')}
              />
              {errors.date && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">End Date</label>
              <input
                type="date"
                value={newEvent.endDate ? format(new Date(newEvent.endDate), 'yyyy-MM-dd') : ''}
                onChange={handleEndDateChange}
                className={`${inputBase} ${errors.endDate ? inputError : inputNormal}`}
                required
                min={format(new Date(), 'yyyy-MM-dd')}
              />
              {errors.endDate && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.endDate}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Start Time</label>
              <input
                type="time"
                value={newEvent.startTime}
                onChange={(e) => {
                  setNewEvent({ ...newEvent, startTime: e.target.value });
                  setErrors({ ...errors, startTime: undefined });
                }}
                className={`${inputBase} ${errors.startTime ? inputError : inputNormal}`}
                required
              />
              {errors.startTime && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.startTime}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">End Time</label>
              <input
                type="time"
                value={newEvent.endTime}
                onChange={(e) => {
                  setNewEvent({ ...newEvent, endTime: e.target.value });
                  setErrors({ ...errors, endTime: undefined });
                }}
                className={`${inputBase} ${errors.endTime ? inputError : inputNormal}`}
                required
              />
              {errors.endTime && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.endTime}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Description</label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className={`${inputBase} ${inputNormal} resize-none`}
                rows={2}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2.5 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddEventModal; 