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
      [
        'Home metrics',
        '- Compact cards that show today’s study time, incomplete task count, total notes, and upcoming events.',
        '- Clicking a card opens the corresponding feature (Study Timer, Tasks, Notebooks, Schedule).',
        '',
        'Recent Note Activities',
        '- Horizontal and grid views of the notes you recently opened or edited.',
        '- Click any note tile to jump straight into that note in its notebook.',
        '',
        'Pending Tasks & Upcoming Events',
        '- Two side‑by‑side panels summarizing your top tasks and nearest schedule items.',
        '- Each row links into the full Tasks or Schedule page for deeper management.',
      ].join('\n'),
  },
  {
    id: 'find-friends',
    name: 'Find Friends',
    icon: Users,
    description:
      [
        'Search panel',
        '- Slide‑in panel that lets you search by username.',
        '- Shows basic profile info so you can quickly recognize classmates or teammates.',
        '',
        'Profile preview',
        '- Click a result to open a richer profile view with avatar, bio, school, and course.',
        '- From there you can follow/unfollow and navigate to chat.',
        '',
        'Social graph',
        '- People you follow appear in other areas like chat, collaboration, and group quizzes.',
      ].join('\n'),
  },
  {
    id: 'messages',
    name: 'Messages',
    icon: MessageCircle,
    description:
      [
        'Chats list',
        '- Shows your recent direct and group conversations, ordered by latest activity.',
        '- Click any conversation to open the full message history.',
        '',
        'Conversation view',
        '- Real‑time message stream with support for text and shared links.',
        '- Useful for coordinating tasks, study plans, or sharing notes and decks.',
        '',
        'Friends integration',
        '- New conversations are started from Find Friends or a user profile you follow.',
      ].join('\n'),
  },
  {
    id: 'progress',
    name: 'Progress',
    icon: BarChart2,
    description:
      [
        'XP and level',
        '- Your current level and XP earned from studying, completing tasks, and collaboration.',
        '',
        'Task and study metrics',
        '- Aggregated counts of completed tasks and total study time.',
        '- Charts or summaries that help you see whether your productivity is trending up or down.',
        '',
        'Trends and summaries',
        '- Weekly and historical views of your activity so you can review how consistent you have been.',
      ].join('\n'),
  },
  {
    id: 'notebooks',
    name: 'Notebooks',
    icon: FileText,
    description:
      [
        'Notebook list',
        '- Sidebar or grid of all your notebooks with quick actions like rename, color, share, archive, and delete.',
        '- Lets you jump into a specific notebook context for focused writing.',
        '',
        'Notes list',
        '- Shows notes within the selected notebook in compact or comfortable layouts.',
        '- Each note row has quick actions (edit title, share, archive, move to trash).',
        '',
        'Note editor',
        '- Rich‑text editor for writing and organizing your ideas.',
        '- Notes here can later feed into Reviewers or Flashcards for active recall.',
      ].join('\n'),
  },
  {
    id: 'flashcards',
    name: 'Flashcards',
    icon: Layers,
    description:
      [
        'Deck list',
        '- Main table/grid of your decks with search, sort, filters, and archived view.',
        '- Each deck card shows title, progress, and key actions (study, manage cards, stats, group quiz).',
        '',
        'Deck details & study',
        '- Manage flashcards inside a deck (add, edit, delete, bulk actions).',
        '- Start practice or quiz sessions to review cards and update deck progress.',
        '',
        'Group quizzes',
        '- Turn a deck into a challenge quiz with friends you follow.',
        '- Create a group quiz, invite participants, and let everyone take the same deck‑based quiz.',
      ].join('\n'),
  },
  {
    id: 'tasks',
    name: 'Tasks',
    icon: CheckSquare,
    description:
      [
        'Task list',
        '- Pending tasks grouped with priority, due date, and category labels.',
        '- Quick actions to edit, complete, or delete tasks without leaving the list.',
        '',
        'Completed tab',
        '- Shows finished tasks sorted by most recently completed.',
        '- Useful as a “done log” so you can see what you accomplished.',
        '',
        'XP and categories',
        '- Completing tasks contributes to your XP and progress stats.',
        '- Categories help you group work by subject, project, or context.',
      ].join('\n'),
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    icon: Brain,
    description:
      [
        'Reviewer list',
        '- Cards showing each reviewer with quick actions such as open, take quiz, and options.',
        '- Indicates whether a reviewer is based on a note, notebook, or custom content.',
        '',
        'Reviewer document view',
        '- Full‑page reading view for the reviewer content with a clean header and footer.',
        '- Designed to feel like a focused study document rather than a modal overlay.',
        '',
        'Interactive quiz',
        '- Generates quiz questions from the reviewer material.',
        '- Lets you test recall and understanding directly from the same source content.',
      ].join('\n'),
  },
  {
    id: 'schedule',
    name: 'Schedule',
    icon: Calendar,
    description:
      [
        'Event list / calendar',
        '- View events with date, time range, and category (study, assignment, exam, meeting, etc.).',
        '- Quickly scan what is coming up in the next few days.',
        '',
        'Event editor',
        '- Create new events or edit existing ones with title, description, category, and time.',
        '- Used to block time for focused study or track important deadlines.',
        '',
        'Home integration',
        '- Upcoming events also appear on the Home page and in the Home “Upcoming Events” panel.',
      ].join('\n'),
  },
  {
    id: 'study-timer',
    name: 'Study Timer',
    icon: Clock,
    description:
      [
        'Timer controls',
        '- Start, pause, and stop buttons for recording focused study sessions.',
        '- Shows the current session length while you work.',
        '',
        'Session history',
        '- Behind the scenes, sessions are logged and summarized per day.',
        '- Today’s total study time is shown on the Home metrics card.',
        '',
        'Progress link',
        '- Session data feeds into Progress charts so you can see long‑term trends.',
      ].join('\n'),
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: Bell,
    description:
      [
        'Notification list',
        '- Stream of alerts about followers, collaboration invitations, tasks, and other key events.',
        '- Each item indicates what happened and when.',
        '',
        'Quick navigation',
        '- Many notifications can be clicked to jump to the relevant page (profile, task, deck, etc.).',
        '',
        'Read state',
        '- As you open and process notifications, you can mark them as seen so the list stays manageable.',
      ].join('\n'),
  },
  {
    id: 'trash',
    name: 'Trash',
    icon: Trash2,
    description:
      [
        'Trashed items list',
        '- Shows notebooks, notes, and other supported items that have been soft‑deleted.',
        '',
        'Restore',
        '- Bring an item back to its original location if you deleted it by accident.',
        '',
        'Permanent delete',
        '- Remove items forever once you are sure they are no longer needed.',
      ].join('\n'),
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    description:
      [
        'Profile & account',
        '- Edit your avatar, bio, school, course, and other basic details.',
        '- Manage email and password when needed.',
        '',
        'App preferences',
        '- Toggle theme and behavioral preferences so the interface feels right for you.',
        '',
        'Integration points',
        '- Some settings control how different features (notifications, collaboration, etc.) behave across the app.',
      ].join('\n'),
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
            <div className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 space-y-2">
              {selected.description.split('\n').map((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) return null;
                if (!trimmed.startsWith('-')) {
                  // Mini feature heading
                  return (
                    <h4
                      key={idx}
                      className="mt-3 text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {trimmed}
                    </h4>
                  );
                }
                const text = trimmed.replace(/^-+\s*/, '');
                return (
                  <p key={idx} className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                    • {text}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default HelpModal;
