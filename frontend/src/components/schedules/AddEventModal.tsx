import React, { useState } from 'react';
import { format, isValid } from 'date-fns';
import { ScheduleEvent } from '../../types/schedule';
import ReactDOM from 'react-dom';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (event: Omit<ScheduleEvent, 'id'>) => void;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onAddEvent }) => {
  const [newEvent, setNewEvent] = useState<Omit<ScheduleEvent, 'id'>>({
    title: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    category: 'study',
    description: '',
  });

  const [errors, setErrors] = useState<{
    title?: string;
    date?: string;
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
        setNewEvent({...newEvent, date});
        setErrors({...errors, date: undefined});
      } else {
        setErrors({...errors, date: 'Please enter a valid date'});
      }
    } catch (error) {
      setErrors({...errors, date: 'Please enter a valid date'});
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Event</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => {
                  setNewEvent({...newEvent, title: e.target.value});
                  setErrors({...errors, title: undefined});
                }}
                className={`mt-1 block w-full p-2 border ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                required
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <input
                type="date"
                value={newEvent.date ? format(new Date(newEvent.date), 'yyyy-MM-dd') : ''}
                onChange={handleDateChange}
                className={`mt-1 block w-full p-2 border ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                required
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
              <input
                type="time"
                value={newEvent.startTime}
                onChange={(e) => {
                  setNewEvent({...newEvent, startTime: e.target.value});
                  setErrors({...errors, startTime: undefined});
                }}
                className={`mt-1 block w-full p-2 border ${
                  errors.startTime ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
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
                value={newEvent.endTime}
                onChange={(e) => {
                  setNewEvent({...newEvent, endTime: e.target.value});
                  setErrors({...errors, endTime: undefined});
                }}
                className={`mt-1 block w-full p-2 border ${
                  errors.endTime ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                required
              />
              {errors.endTime && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endTime}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select
                value={newEvent.category}
                onChange={(e) => setNewEvent({...newEvent, category: e.target.value as any})}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="study">Study</option>
                <option value="assignment">Assignment</option>
                <option value="exam">Exam</option>
                <option value="meeting">Meeting</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={3}
              />
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