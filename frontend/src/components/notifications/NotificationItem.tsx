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
  Info,
  User,
} from 'lucide-react';

export interface NotificationItemProps {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  isRead: boolean;
  notificationType: 'task_due' | 'task_completed' | 'note_reminder' | 'study_reminder' | 'schedule_reminder' | 'social_follow' | 'general';
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
      case 'social_follow':
        return {
          icon: <User size={24} className="text-indigo-600 dark:text-indigo-400" />,
          bgColor: 'bg-indigo-100 dark:bg-indigo-900/20'
        };
      case 'task_completed':
        return {
          icon: <CheckCircle size={24} className="text-green-600 dark:text-green-400" />,
          bgColor: 'bg-green-100 dark:bg-green-900/20'
        };
      case 'task_due':
        return {
          icon: <AlertTriangle size={24} className="text-orange-600 dark:text-orange-400" />,
          bgColor: 'bg-orange-100 dark:bg-orange-900/20'
        };
      case 'note_reminder':
        return {
          icon: <FileText size={24} className="text-blue-600 dark:text-blue-400" />,
          bgColor: 'bg-blue-100 dark:bg-blue-900/20'
        };
      case 'study_reminder':
        return {
          icon: <BookOpen size={24} className="text-purple-600 dark:text-purple-400" />,
          bgColor: 'bg-purple-100 dark:bg-purple-900/20'
        };
      case 'schedule_reminder':
        return {
          icon: <Calendar size={24} className="text-indigo-600 dark:text-indigo-400" />,
          bgColor: 'bg-indigo-100 dark:bg-indigo-900/20'
        };
      default:
        // Fallback to type-based icons
        switch (type) {
          case 'success':
            return {
              icon: <CheckCircle size={24} className="text-green-600 dark:text-green-400" />,
              bgColor: 'bg-green-100 dark:bg-green-900/20'
            };
          case 'warning':
            return {
              icon: <AlertTriangle size={24} className="text-yellow-600 dark:text-yellow-400" />,
              bgColor: 'bg-yellow-100 dark:bg-yellow-900/20'
            };
          case 'error':
            return {
              icon: <XCircle size={24} className="text-red-600 dark:text-red-400" />,
              bgColor: 'bg-red-100 dark:bg-red-900/20'
            };
          default:
            return {
              icon: <Info size={24} className="text-blue-600 dark:text-blue-400" />,
              bgColor: 'bg-blue-100 dark:bg-blue-900/20'
            };
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
  const iconData = getNotificationIcon();

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
        <div className="flex items-center flex-1">
          <div className="flex-shrink-0">
            <div className={`p-3 ${iconData.bgColor} rounded-lg`}>
              {iconData.icon}
            </div>
          </div>
          <div className="ml-4 flex-1">
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