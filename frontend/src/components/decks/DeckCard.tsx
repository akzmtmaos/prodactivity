import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Edit, Trash2, BarChart2, Play, HelpCircle, MoreVertical, RotateCcw } from 'lucide-react';

interface Deck {
  id: string;
  title: string;
  flashcardCount: number;
  progress: number;
  lastStudied?: string;
  created_at: string;
  updated_at: string;
  createdAt: string;
  flashcards: any[];
  subDecks?: any[];
  is_deleted: boolean;
  is_archived: boolean;
  archived_at?: string;
}

interface DeckCardProps {
  deck: Deck;
  onStudy: (deckId: string) => void;
  onQuiz: (deckId: string) => void;
  onEdit: (deckId: string) => void;
  onDelete: (deckId: string) => void;
  onViewStats: (deckId: string) => void;
  onOpen: (deckId: string) => void;
  onArchive?: (deckId: string) => void;
  onResetProgress?: (deckId: string) => void; // New prop for resetting progress
  isSubDeck?: boolean; // New prop to identify if this is a SubDeck
  onEditSubDeck?: (deck: Deck) => void; // New prop for editing SubDecks
}

const DeckCard: React.FC<DeckCardProps> = ({
  deck,
  onStudy,
  onQuiz,
  onEdit,
  onDelete,
  onViewStats,
  onOpen,
  onArchive,
  onResetProgress,
  isSubDeck = false,
  onEditSubDeck
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    // Close menu when pressing Escape key
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMenu(false);
      }
    };

    // Update menu position when window resizes
    const handleResize = () => {
      if (showMenu && menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    window.addEventListener('resize', handleResize);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      window.removeEventListener('resize', handleResize);
    };
  }, [showMenu]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Handle edit based on whether it's a SubDeck or parent deck
  const handleEdit = () => {
    if (isSubDeck && onEditSubDeck) {
      onEditSubDeck(deck);
    } else {
      onEdit(deck.id);
    }
    setShowMenu(false);
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => onOpen(deck.id)}
    >
      <div className="p-6">
        {/* Card Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1 truncate">
              {deck.title}
              {isSubDeck && (
                <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/20 px-2 py-1 rounded">
                  SubDeck
                </span>
              )}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {deck.flashcardCount} cards
              {deck.subDecks && deck.subDecks.length > 0 && !isSubDeck && (
                <span className="ml-2 text-indigo-600 dark:text-indigo-400">
                  +{deck.subDecks.length} subdecks
                </span>
              )}
            </p>
          </div>
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (menuRef.current) {
                  const rect = menuRef.current.getBoundingClientRect();
                  setMenuPosition({
                    top: rect.bottom + 8,
                    right: window.innerWidth - rect.right
                  });
                }
                setShowMenu(!showMenu);
              }}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <MoreVertical size={18} />
            </button>
            
            {/* Dropdown Menu */}
            {showMenu && (
              <div 
                className="fixed z-[9999] w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
                style={{
                  top: menuPosition.top,
                  right: menuPosition.right,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
                >
                  <Edit size={16} className="mr-3" />
                  {isSubDeck ? 'Edit SubDeck' : 'Edit Deck'}
                </button>
                <button
                  onClick={() => {
                    onViewStats(deck.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
                >
                  <BarChart2 size={16} className="mr-3" />
                  View Stats
                </button>
                {onArchive && (
                  <button
                    onClick={() => {
                      onArchive(deck.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
                  >
                    <BookOpen size={16} className="mr-3" />
                    {deck.is_archived ? 'Unarchive' : 'Archive'}
                  </button>
                )}
                {onResetProgress && deck.progress > 0 && (
                  <button
                    onClick={() => {
                      onResetProgress(deck.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
                  >
                    <RotateCcw size={16} className="mr-3" />
                    Reset Progress
                  </button>
                )}
                <hr className="border-gray-200 dark:border-gray-600 my-1" />
                <button
                  onClick={() => {
                    onDelete(deck.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
                >
                  <Trash2 size={16} className="mr-3" />
                  {isSubDeck ? 'Delete SubDeck' : 'Delete Deck'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {deck.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(deck.progress)}`}
              style={{ width: `${deck.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStudy(deck.id);
            }}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Play size={16} className="mr-2" />
            Study
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuiz(deck.id);
            }}
            className="flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <HelpCircle size={16} className="mr-3" />
            Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckCard;