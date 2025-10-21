import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText, 
  BookOpen, 
  Calendar,
  Bell,
  AlertTriangle,
  XCircle,
  Info
} from 'lucide-react';

export interface NotificationItemProps {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  isRead: boolean;
  notificationType: 'task_due' | 'task_completed' | 'note_reminder' | 'study_reminder' | 'schedule_reminder' | 'general';
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  title,
  message,
  type,
  timestamp,
  isRead,
  notificationType,
  onMarkAsRead,
}) => {
  const navigate = useNavigate();

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    }
  };

  const getNotificationIcon = () => {
    // First check notification type for specific icons
    switch (notificationType) {
      case 'task_completed':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'task_due':
        return <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
      case 'note_reminder':
        return <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'study_reminder':
        return <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case 'schedule_reminder':
        return <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
      default:
        // Fallback to type-based icons
        switch (type) {
          case 'success':
            return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
          case 'warning':
            return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
          case 'error':
            return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
          default:
            return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
        }
    }
  };

  const handleClick = async () => {
    console.log('🖱️ Notification clicked:', { id, title, isRead });
    
    // Mark as read when clicked (await to ensure it completes)
    if (!isRead) {
      console.log('🖱️ Marking as read...');
      await onMarkAsRead(id);
      console.log('🖱️ Mark as read completed');
    } else {
      console.log('🖱️ Already read, skipping mark as read');
    }

    // Navigate based on notification type
    console.log('🖱️ Navigating to:', notificationType);
    switch (notificationType) {
      case 'schedule_reminder':
        navigate('/schedule');
        break;
      case 'task_due':
      case 'task_completed':
        navigate('/tasks');
        break;
      case 'note_reminder':
        navigate('/notes');
        break;
      case 'study_reminder':
        navigate('/study-timer');
        break;
      default:
        // No navigation for general notifications
        break;
    }
  };

  const hasNavigation = notificationType !== 'general';

  return (
    <div
      onClick={handleClick}
      className={`p-4 border rounded-lg ${getTypeStyles()} ${
        !isRead ? 'border-l-4' : ''
      } transition-all duration-200 hover:shadow-md ${
        hasNavigation ? 'cursor-pointer hover:scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon()}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{message}</p>
            <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="h-3 w-3 mr-1" />
              <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
            </div>
          </div>
        </div>
        {!isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent navigation when clicking mark as read
              onMarkAsRead(id);
            }}
            className="ml-4 text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationItem; 