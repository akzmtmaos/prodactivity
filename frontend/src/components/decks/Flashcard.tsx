import React, { useState } from 'react';
import { RotateCcw, Eye, EyeOff } from 'lucide-react';

interface FlashcardData {
  id: string;
  front: string;
  back: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface FlashcardProps {
  flashcard: FlashcardData;
  showAnswer?: boolean;
  onFlip?: () => void;
  isStudyMode?: boolean;
  onDifficultySelect?: (difficulty: 'easy' | 'medium' | 'hard') => void;
}

const Flashcard: React.FC<FlashcardProps> = ({
  flashcard,
  showAnswer = false,
  onFlip,
  isStudyMode = false,
  onDifficultySelect
}) => {
  const [isFlipped, setIsFlipped] = useState(showAnswer);

  const handleFlip = () => {
    if (onFlip) {
      onFlip();
    } else {
      setIsFlipped(!isFlipped);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main Card */}
      <div 
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-all duration-300 hover:shadow-xl"
        onClick={handleFlip}
        style={{ minHeight: '300px' }}
      >
        {/* Flip Icon */}
        <div className="absolute top-4 right-4 z-10">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <RotateCcw size={16} className="text-gray-600 dark:text-gray-400" />
          </div>
        </div>

        {/* Card Content */}
        <div className="p-8 h-full flex flex-col justify-center items-center text-center">
          <div className="w-full">
            {!isFlipped ? (
              // Front of card
              <div className="space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                    <Eye size={20} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Question
                </h3>
                <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed">
                  {flashcard.front}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
                  Click to reveal answer
                </p>
              </div>
            ) : (
              // Back of card
              <div className="space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <EyeOff size={20} className="text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Answer
                </h3>
                <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed">
                  {flashcard.back}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Difficulty Badge */}
        {flashcard.difficulty && (
          <div className="absolute bottom-4 left-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(flashcard.difficulty)}`}>
              {flashcard.difficulty}
            </span>
          </div>
        )}
      </div>

      {/* Study Mode Actions */}
      {isStudyMode && isFlipped && onDifficultySelect && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
            How difficult was this card?
          </p>
          <div className="flex space-x-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDifficultySelect('easy');
              }}
              className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              Easy
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDifficultySelect('medium');
              }}
              className="flex-1 py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
            >
              Medium
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDifficultySelect('hard');
              }}
              className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              Hard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flashcard;