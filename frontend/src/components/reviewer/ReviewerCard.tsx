import React from 'react';
import { Star, StarOff, Trash2, Download, Share2 } from 'lucide-react';
import { truncateHtmlContent } from '../../utils/htmlUtils';

interface Reviewer {
  id: number;
  title: string;
  content: string;
  source_note?: number | null;
  source_note_title?: string;
  source_notebook?: number | null;
  source_notebook_name?: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  tags: string[];
}

interface ReviewerCardProps {
  reviewer: Reviewer;
  onFavorite?: (id: number) => void;
  onDelete: (id: number) => void;
  onGenerateQuiz?: (reviewer: Reviewer) => void;
  onClick: () => void;
  quizLoadingId?: number | null;
  showFavorite?: boolean;
  showGenerateQuiz?: boolean;
}

const ReviewerCard: React.FC<ReviewerCardProps> = ({
  reviewer,
  onFavorite,
  onDelete,
  onGenerateQuiz,
  onClick,
  quizLoadingId,
  showFavorite = true,
  showGenerateQuiz = true,
}) => {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {reviewer.title}
            </h3>
          </div>
          {reviewer.source_note_title && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              From: {reviewer.source_note_title}
            </p>
          )}
          {reviewer.source_notebook_name && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              From: {reviewer.source_notebook_name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showFavorite && onFavorite && (
            <button
              onClick={e => {
                e.stopPropagation();
                onFavorite(reviewer.id);
              }}
              className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
            >
              {reviewer.is_favorite ? <Star size={16} className="text-yellow-500 fill-current" /> : <StarOff size={16} />}
            </button>
          )}
          <button
            onClick={e => {
              e.stopPropagation();
              onDelete(reviewer.id);
            }}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
          {showGenerateQuiz && onGenerateQuiz && (
            <button
              onClick={e => {
                e.stopPropagation();
                onGenerateQuiz(reviewer);
              }}
              className={`flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={quizLoadingId === reviewer.id}
            >
              {quizLoadingId === reviewer.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Quiz...
                </>
              ) : (
                <>Generate Quiz</>
              )}
            </button>
          )}
        </div>
      </div>
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap" style={{ maxHeight: '200px', overflow: 'hidden' }}>
          {truncateHtmlContent(reviewer.content, 300)}
        </div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Created: {new Date(reviewer.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <Download size={16} />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <Share2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewerCard; 