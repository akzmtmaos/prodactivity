import React, { useState, useEffect, useRef } from 'react';
import { Edit, Trash2, BarChart2, Play, HelpCircle, MoreVertical, RotateCcw, Users, Archive } from 'lucide-react';
import HeaderTooltip from '../common/HeaderTooltip';

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
  onResetProgress?: (deckId: string) => void;
  onCreateGroupQuiz?: (deckId: string) => void;
  isSubDeck?: boolean;
  onEditSubDeck?: (deck: Deck) => void;
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
  onCreateGroupQuiz,
  isSubDeck = false,
  onEditSubDeck,
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
          right: window.innerWidth - rect.right,
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
      className="bg-white dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-[#333333] shadow-sm hover:shadow-lg hover:border-gray-300 dark:hover:border-[#444444] transition-all duration-200 cursor-pointer"
      onClick={() => onOpen(deck.id)}
    >
      <div className="p-5">
        {/* Card Header */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate leading-tight flex items-center gap-2">
              <span className="truncate">{deck.title}</span>
              {isSubDeck && (
                <span className="flex-shrink-0 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/20 px-2 py-0.5 rounded">
                  SubDeck
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {deck.flashcardCount} cards
              {deck.subDecks && deck.subDecks.length > 0 && !isSubDeck && (
                <span className="ml-2 text-indigo-600 dark:text-indigo-400">
                  +{deck.subDecks.length} subdecks
                </span>
              )}
            </p>
          </div>

          <div className="relative flex-shrink-0" ref={menuRef}>
            <HeaderTooltip label="More actions" side="bottom" fixed>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (menuRef.current) {
                    const rect = menuRef.current.getBoundingClientRect();
                    setMenuPosition({
                      top: rect.bottom + 8,
                      right: window.innerWidth - rect.right,
                    });
                  }
                  setShowMenu(!showMenu);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors rounded-lg border border-gray-200 dark:border-[#333333] hover:bg-gray-100 dark:hover:bg-[#333333]"
                aria-label="More actions"
              >
                <MoreVertical size={18} />
              </button>
            </HeaderTooltip>

            {/* Dropdown Menu */}
            {showMenu && (
              <div
                className="fixed z-[9999] w-52 bg-white dark:bg-[#252525] rounded-lg shadow-xl border border-gray-200 dark:border-[#333333] py-1"
                style={{
                  top: menuPosition.top,
                  right: menuPosition.right,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333333] flex items-center transition-colors"
                >
                  <Edit size={16} className="mr-3 text-gray-400" />
                  {isSubDeck ? 'Edit SubDeck' : 'Edit deck'}
                </button>
                <button
                  onClick={() => {
                    onViewStats(deck.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333333] flex items-center transition-colors"
                >
                  <BarChart2 size={16} className="mr-3 text-gray-400" />
                  View stats
                </button>
                {onCreateGroupQuiz && !isSubDeck && (
                  <button
                    onClick={() => {
                      onCreateGroupQuiz(deck.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333333] flex items-center transition-colors"
                  >
                    <Users size={16} className="mr-3 text-gray-400" />
                    Create group quiz
                  </button>
                )}
                {onArchive && (
                  <button
                    onClick={() => {
                      onArchive(deck.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333333] flex items-center transition-colors"
                  >
                    <Archive size={16} className="mr-3 text-gray-400" />
                    {deck.is_archived ? 'Unarchive' : 'Archive'}
                  </button>
                )}
                {onResetProgress && deck.progress > 0 && (
                  <button
                    onClick={() => {
                      onResetProgress(deck.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-[#333333] flex items-center transition-colors"
                  >
                    <RotateCcw size={16} className="mr-3" />
                    Reset Progress
                  </button>
                )}
                <hr className="border-gray-200 dark:border-[#333333] my-1" />
                <button
                  onClick={() => {
                    onDelete(deck.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-[#333333] flex items-center transition-colors"
                >
                  <Trash2 size={16} className="mr-3" />
                  {isSubDeck ? 'Delete SubDeck' : 'Delete deck'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="relative mt-4 h-5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-[#333333]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(deck.progress)}`}
            style={{ width: `${Math.max(0, Math.min(100, deck.progress))}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-800 dark:text-white">
            {deck.progress}%
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStudy(deck.id);
            }}
            className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            <Play size={14} />
            Study
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuiz(deck.id);
            }}
            className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
          >
            <HelpCircle size={14} />
            Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckCard;
