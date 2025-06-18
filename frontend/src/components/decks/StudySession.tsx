import React, { useState, useEffect } from 'react';
import { ArrowLeft, SkipForward, RotateCcw, CheckCircle, Target } from 'lucide-react';
import Flashcard from './Flashcard';

interface FlashcardData {
  id: string;
  front: string;
  back: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface StudySessionProps {
  deckTitle: string;
  flashcards: FlashcardData[];
  onClose: () => void;
  onComplete: (results: StudyResults) => void;
}

interface StudyResults {
  totalCards: number;
  completedCards: number;
  easyCards: number;
  mediumCards: number;
  hardCards: number;
  timeSpent: number;
}

const StudySession: React.FC<StudySessionProps> = ({
  deckTitle,
  flashcards,
  onClose,
  onComplete
}) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completedCards, setCompletedCards] = useState<Set<string>>(new Set());
  const [cardResults, setCardResults] = useState<Record<string, 'easy' | 'medium' | 'hard'>>({});
  const [startTime] = useState(Date.now());
  const [sessionComplete, setSessionComplete] = useState(false);

  const currentCard = flashcards[currentCardIndex];
  const progress = (completedCards.size / flashcards.length) * 100;

  const handleFlip = () => {
    setShowAnswer(!showAnswer);
  };

  const handleDifficultySelect = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!currentCard) return;

    // Mark card as completed and record difficulty
    const newCompleted = new Set(completedCards);
    newCompleted.add(currentCard.id);
    setCompletedCards(newCompleted);

    const newResults = { ...cardResults };
    newResults[currentCard.id] = difficulty;
    setCardResults(newResults);

    // Move to next card or complete session
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      completeSession(newCompleted, newResults);
    }
  };

  const handleSkip = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    }
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setShowAnswer(false);
    }
  };

  const completeSession = (completed: Set<string>, results: Record<string, 'easy' | 'medium' | 'hard'>) => {
    const timeSpent = Math.round((Date.now() - startTime) / 1000 / 60); // minutes
    const easyCards = Object.values(results).filter(r => r === 'easy').length;
    const mediumCards = Object.values(results).filter(r => r === 'medium').length;
    const hardCards = Object.values(results).filter(r => r === 'hard').length;

    const studyResults: StudyResults = {
      totalCards: flashcards.length,
      completedCards: completed.size,
      easyCards,
      mediumCards,
      hardCards,
      timeSpent
    };

    setSessionComplete(true);
    onComplete(studyResults);
  };

  const resetSession = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setCompletedCards(new Set());
    setCardResults({});
    setSessionComplete(false);
  };

  if (sessionComplete) {
    const easyCount = Object.values(cardResults).filter(r => r === 'easy').length;
    const mediumCount = Object.values(cardResults).filter(r => r === 'medium').length;
    const hardCount = Object.values(cardResults).filter(r => r === 'hard').length;
    const timeSpent = Math.round((Date.now() - startTime) / 1000 / 60);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={onClose}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back to Decks
            </button>
          </div>

          {/* Completion Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Study Session Complete!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Great job studying "{deckTitle}"
              </p>
            </div>

            {/* Results */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {completedCards.size}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Cards Studied
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {easyCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Easy
                </div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {mediumCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Medium
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {hardCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Hard
                </div>
              </div>
            </div>

            <div className="flex space-x-4 justify-center">
              <button
                onClick={resetSession}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Study Again
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Back to Decks
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onClose}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Decks
          </button>
          <div className="text-right">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {deckTitle}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Card {currentCardIndex + 1} of {flashcards.length}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Flashcard */}
        {currentCard && (
          <div className="mb-8">
            <Flashcard
              flashcard={currentCard}
              showAnswer={showAnswer}
              onFlip={handleFlip}
              isStudyMode={true}
              onDifficultySelect={handleDifficultySelect}
            />
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handlePrevious}
            disabled={currentCardIndex === 0}
            className={`px-4 py-2 rounded-lg font-medium flex items-center transition-colors ${
              currentCardIndex === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
            }`}
          >
            Previous
          </button>
          
          <button
            onClick={handleSkip}
            disabled={currentCardIndex >= flashcards.length - 1}
            className={`px-4 py-2 rounded-lg font-medium flex items-center transition-colors ${
              currentCardIndex >= flashcards.length - 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SkipForward size={16} className="mr-2" />
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudySession;