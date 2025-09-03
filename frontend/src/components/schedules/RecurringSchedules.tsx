import React, { useState } from 'react';
import { format } from 'date-fns';
import { RecurringSchedule } from '../../types/schedule';
import { Calendar, Clock, Repeat, Edit, Trash2, Play, Pause } from 'lucide-react';

interface RecurringSchedulesProps {
  recurringSchedules: RecurringSchedule[];
  onDeleteSchedule: (id: string) => void;
  onToggleActive: (id: string) => void;
  onEditSchedule: (schedule: RecurringSchedule) => void;
}

const RecurringSchedules: React.FC<RecurringSchedulesProps> = ({
  recurringSchedules,
  onDeleteSchedule,
  onToggleActive,
  onEditSchedule,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getFrequencyText = (schedule: RecurringSchedule) => {
    const interval = schedule.interval > 1 ? `every ${schedule.interval} ` : 'every ';
    const frequency = schedule.frequency;
    
    switch (frequency) {
      case 'daily':
        return `${interval}day${schedule.interval > 1 ? 's' : ''}`;
      case 'weekly':
        if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
          const days = schedule.daysOfWeek.map(day => {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return dayNames[day];
          }).join(', ');
          return `${interval}week on ${days}`;
        }
        return `${interval}week${schedule.interval > 1 ? 's' : ''}`;
      case 'monthly':
        if (schedule.dayOfMonth) {
          return `${interval}month on the ${schedule.dayOfMonth}${getOrdinalSuffix(schedule.dayOfMonth)}`;
        }
        return `${interval}month${schedule.interval > 1 ? 's' : ''}`;
      case 'yearly':
        return `${interval}year${schedule.interval > 1 ? 's' : ''}`;
      default:
        return frequency;
    }
  };

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      study: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      assignment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      exam: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      meeting: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[category] || colors.other;
  };

  if (recurringSchedules.length === 0) {
    return (
      <div className="text-center py-12">
        <Repeat className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No recurring schedules</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by creating a recurring schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recurringSchedules.map((schedule) => (
        <div
          key={schedule.id}
          className={`bg-white dark:bg-gray-800 rounded-lg border ${
            schedule.isActive ? 'border-green-200 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'
          } shadow-sm hover:shadow-md transition-shadow`}
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                    {schedule.title}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(schedule.category)}`}>
                    {schedule.category}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    schedule.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {schedule.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(schedule.startDate), 'MMM dd, yyyy')}
                      {schedule.endDate && ` - ${format(new Date(schedule.endDate), 'MMM dd, yyyy')}`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{schedule.startTime} - {schedule.endTime}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Repeat className="h-4 w-4" />
                    <span>{getFrequencyText(schedule)}</span>
                  </div>
                </div>

                {schedule.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {schedule.description}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onToggleActive(schedule.id)}
                  className={`p-2 rounded-md transition-colors ${
                    schedule.isActive
                      ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900'
                      : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={schedule.isActive ? 'Pause schedule' : 'Activate schedule'}
                >
                  {schedule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => onEditSchedule(schedule)}
                  className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-md transition-colors"
                  title="Edit schedule"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeleteSchedule(schedule.id)}
                  className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-md transition-colors"
                  title="Delete schedule"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {expandedId === schedule.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Frequency:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">{getFrequencyText(schedule)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      {schedule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {schedule.lastGenerated && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Last Generated:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {format(new Date(schedule.lastGenerated), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setExpandedId(expandedId === schedule.id ? null : schedule.id)}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              {expandedId === schedule.id ? 'Show less' : 'Show more'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecurringSchedules;
