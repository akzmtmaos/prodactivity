import React, { useState } from 'react';
import { BookOpen, Edit, Trash2, BarChart2, Play, HelpCircle, MoreVertical } from 'lucide-react';

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
  is_deleted: boolean;
}

interface DeckCardProps {
  deck: Deck;
  onStudy: (deckId: string) => void;
  onQuiz: (deckId: string) => void;
  onEdit: (deckId: string) => void;
  onDelete: (deckId: string) => void;
  onViewStats: (deckId: string) => void;
  onOpen: (deckId: string) => void;
}

const DeckCard: React.FC<DeckCardProps> = ({
  deck,
  onStudy,
  onQuiz,
  onEdit,
  onDelete,
  onViewStats,
  onOpen
}) => {
  const [showMenu, setShowMenu] = useState(false);

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
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {deck.flashcardCount} cards
            </p>
          </div>
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <MoreVertical size={18} />
            </button>
            
            {/* Dropdown Menu */}
            {showMenu && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    onEdit(deck.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <Edit size={16} className="mr-2" />
                  Edit Deck
                </button>
                <button
                  onClick={() => {
                    onViewStats(deck.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <BarChart2 size={16} className="mr-2" />
                  View Stats
                </button>
                <button
                  onClick={() => {
                    onDelete(deck.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete Deck
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
            Practice
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuiz(deck.id);
            }}
            className="flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <HelpCircle size={16} className="mr-2" />
            Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckCard;