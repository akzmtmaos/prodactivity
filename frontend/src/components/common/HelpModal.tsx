import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Home,
  Users,
  MessageCircle,
  BarChart2,
  FileText,
  Layers,
  CheckSquare,
  Brain,
  Calendar,
  Clock,
  Bell,
  Trash2,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface HelpItem {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
}

const HELP_ITEMS: HelpItem[] = [
  {
    id: 'home',
    name: 'Home',
    icon: Home,
    description:
      'Your dashboard. See today’s study time, incomplete tasks count, notes count, and upcoming events. Recent note activities are shown for quick access. Click any card or "View All" to go to that section.',
  },
  {
    id: 'find-friends',
    name: 'Find Friends',
    icon: Users,
    description:
      'Search for other users by username. A panel opens from the left where you can type to find people. Click a user to open their profile. From their profile you can follow them or start a message.',
  },
  {
    id: 'messages',
    name: 'Messages',
    icon: MessageCircle,
    description:
      'Chat with others. Use the "Chat" tab for direct messages and the "Groups" tab for group conversations. Search and filter your chats. Start new conversations from Find Friends or from a user’s profile.',
  },
  {
    id: 'progress',
    name: 'Progress',
    icon: BarChart2,
    description:
      'Track your productivity. View XP, level, and progress over time. See task completion stats, study time, and achievements. Use this page to review how you’re doing and stay motivated.',
  },
  {
    id: 'notebooks',
    name: 'Notebooks',
    icon: FileText,
    description:
      'Create and organize notebooks and notes. Each notebook can hold multiple notes. Use search and filters to find notes quickly. Create, edit, and organize your study materials here.',
  },
  {
    id: 'flashcards',
    name: 'Flashcards',
    icon: Layers,
    description:
      'Create decks and flashcards for studying. Build decks, add cards, and study with built-in review. Track progress per deck. Use this to memorize and review important content.',
  },
  {
    id: 'tasks',
    name: 'Tasks',
    icon: CheckSquare,
    description:
      'Manage your to-do list. Add tasks with priority, due date, and category. Mark tasks complete to earn XP. You can also assign tasks to others and work on tasks together.',
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    icon: Brain,
    description:
      'Use reviewers to study and quiz yourself. Create or open reviewers linked to your content. Good for structured review and self-testing.',
  },
  {
    id: 'schedule',
    name: 'Schedule',
    icon: Calendar,
    description:
      'Plan your day. Create events with title, time, and category (e.g. study, assignment, exam). View upcoming events on the calendar and stay on top of deadlines.',
  },
  {
    id: 'study-timer',
    name: 'Study Timer',
    icon: Clock,
    description:
      'Track study time with a timer. Start study sessions and log how long you study. Your today’s study time is shown on the Home dashboard.',
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: Bell,
    description:
      'See your notifications in one place. Get alerts for things like new followers, task assignments, and other activity. Mark them as read as you go.',
  },
  {
    id: 'trash',
    name: 'Trash',
    icon: Trash2,
    description:
      'View trashed items (e.g. notes, notebooks). Restore items you deleted by mistake or permanently delete them to free space.',
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    description:
      'Manage your account and app preferences. Update profile, password, and other settings. Configure how ProdActivity works for you.',
  },
];

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [selectedId, setSelectedId] = useState<string>(HELP_ITEMS[0].id);

  const selected = HELP_ITEMS.find((item) => item.id === selectedId) ?? HELP_ITEMS[0];

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative flex w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-md bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333333] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1e1e1e] z-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Help</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content: left nav + right description */}
        <div className="flex w-full pt-14 min-h-0">
          {/* Left: Nav items */}
          <div className="w-52 flex-shrink-0 border-r border-gray-200 dark:border-[#333333] overflow-y-auto bg-gray-50 dark:bg-[#252525]">
            <nav className="p-2">
              {HELP_ITEMS.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d]'
                    }`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Description */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-3 mb-4">
              {(() => {
                const Icon = selected.icon;
                return (
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                    <Icon size={24} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                );
              })()}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selected.name}</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-line">
              {selected.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default HelpModal;
