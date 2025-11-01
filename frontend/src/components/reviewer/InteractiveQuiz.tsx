import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, CheckCircle, XCircle, RotateCcw, Trophy, Clock, Target } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';

interface Question {
  number: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

interface Quiz {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface InteractiveQuizProps {
  quiz: Quiz;
  onClose: () => void;
  onScoreUpdate?: (quizId: number, score: number) => void;
}

const parseQuizContent = (content: string): Question[] => {
  const questions: Question[] = [];
  const lines = content.split(/\r?\n/);
  
  let currentQuestion: Partial<Question> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Match question line: Q1., Q2., etc.
    const questionMatch = line.match(/^Q(\d+)\.\s*(.+)/i);
    if (questionMatch) {
      // Save previous question if valid
      if (currentQuestion && currentQuestion.number && currentQuestion.question && currentQuestion.options && currentQuestion.correctAnswer) {
        questions.push(currentQuestion as Question);
      }
      
      const questionText = questionMatch[2];
      
      // Skip if this looks like a section header (contains : or – or —)
      // These are lines like "Q3. The Concept: Something – Subtitle"
      const looksLikeHeader = questionText.includes(':') || questionText.includes('–') || questionText.includes('—');
      
      // Start new question (with empty text if it's a header - will be filled by next line)
      currentQuestion = {
        number: parseInt(questionMatch[1]),
        question: looksLikeHeader ? '' : questionText,
        options: { A: '', B: '', C: '', D: '' }
      };
      continue;
    }
    
    // Match option lines: A), B), C), D)
    const optionMatch = line.match(/^([A-D])\)\s*(.+)/i);
    if (optionMatch && currentQuestion && currentQuestion.options) {
      const optionLetter = optionMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      currentQuestion.options[optionLetter] = optionMatch[2];
      continue;
    }
    
    // Skip "Correct" line (it's just a separator before "Answer:")
    if (line.toLowerCase() === 'correct') {
      continue;
    }
    
    // Match answer line: "Answer: A" or "Correct Answer: A"
    const answerMatch = line.match(/^(?:Correct\s+)?Answer:\s*([A-D])/i);
    if (answerMatch && currentQuestion) {
      currentQuestion.correctAnswer = answerMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      continue;
    }
    
    // If we have a current question but haven't hit options yet, 
    // append this line to the question text (handles multi-line questions)
    if (currentQuestion && !currentQuestion.correctAnswer) {
      // Check if we haven't started options yet (all options are empty)
      const hasOptions = Object.values(currentQuestion.options || {}).some(opt => opt !== '');
      if (!hasOptions) {
        // Skip lines that look like section headers (contain colons or dashes)
        // These are typically formatting like "The Concept: Something" or "Title – Subtitle"
        const looksLikeHeader = line.includes(':') || line.includes('–') || line.includes('—');
        if (!looksLikeHeader) {
          // If question is empty, set it; otherwise append
          if (!currentQuestion.question) {
            currentQuestion.question = line;
          } else {
            currentQuestion.question += ' ' + line;
          }
        }
      }
    }
  }
  
  // Push last question if valid
  if (currentQuestion && currentQuestion.number && currentQuestion.question && currentQuestion.options && currentQuestion.correctAnswer) {
    questions.push(currentQuestion as Question);
  }
  
  return questions;
};

const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({ quiz, onClose, onScoreUpdate }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: 'A' | 'B' | 'C' | 'D' }>({});
  const [showResults, setShowResults] = useState(false);
  const [startTime] = useState(Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);
  const [scoreSaved, setScoreSaved] = useState(false);

  useEffect(() => {
    const parsed = parseQuizContent(quiz.content);
    setQuestions(parsed);
  }, [quiz.content]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(userAnswers).length;

  const handleAnswerSelect = (answer: 'A' | 'B' | 'C' | 'D') => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.number]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    setEndTime(Date.now());
    setShowResults(true);
  };

  const handleRestart = () => {
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setEndTime(null);
    setScoreSaved(false);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (userAnswers[q.number] === q.correctAnswer) {
        correct++;
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100)
    };
  };

  const saveScore = async (scoreData: { percentage: number; correct: number; total: number }) => {
    if (scoreSaved) return; // Prevent duplicate saves
    
    try {
      await axiosInstance.patch(`/reviewers/${quiz.id}/`, {
        best_score: scoreData.percentage,
        best_score_correct: scoreData.correct,
        best_score_total: scoreData.total
      });
      setScoreSaved(true);
      
      // Call parent callback if provided
      if (onScoreUpdate) {
        onScoreUpdate(quiz.id, scoreData.percentage);
      }
      
      console.log(`✅ Score saved: ${scoreData.correct}/${scoreData.total} (${scoreData.percentage}%) for quiz ${quiz.id}`);
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  // Save score when results are shown
  useEffect(() => {
    if (showResults && !scoreSaved) {
      const score = calculateScore();
      saveScore({
        percentage: score.percentage,
        correct: score.correct,
        total: score.total
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults, scoreSaved]);

  const getTimeTaken = () => {
    if (!endTime) return '0:00';
    const seconds = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (questions.length === 0) {
    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl p-8">
          <div className="text-center">
            <XCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Quiz Format</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Unable to parse quiz questions. Please ensure the quiz is properly formatted.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (showResults) {
    const score = calculateScore();
    const timeTaken = getTimeTaken();

    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div className="flex items-center gap-3">
              <Trophy size={28} />
              <div>
                <h2 className="text-2xl font-bold">Quiz Results</h2>
                <p className="text-indigo-100 text-sm">{quiz.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          {/* Score Summary */}
          <div className="px-8 py-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target size={20} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Score</span>
                </div>
                <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                  {score.percentage}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {score.correct} / {score.total} correct
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock size={20} className="text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Time</span>
                </div>
                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                  {timeTaken}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total time taken
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy size={20} className="text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Grade</span>
                </div>
                <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                  {score.percentage >= 90 ? 'A' : score.percentage >= 80 ? 'B' : score.percentage >= 70 ? 'C' : score.percentage >= 60 ? 'D' : 'F'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Performance
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="flex-1 overflow-auto px-8 py-6 space-y-6">
            {questions.map((question, index) => {
              const userAnswer = userAnswers[question.number];
              const isCorrect = userAnswer === question.correctAnswer;
              const wasAnswered = userAnswer !== undefined;

              return (
                <div
                  key={question.number}
                  className={`rounded-xl border-2 p-6 transition-all ${
                    isCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : wasAnswered
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {isCorrect ? (
                        <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                      ) : wasAnswered ? (
                        <XCircle size={24} className="text-red-600 dark:text-red-400" />
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                        {question.number}. {question.question}
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(question.options).map(([letter, text]) => {
                          const isUserAnswer = userAnswer === letter;
                          const isCorrectAnswer = question.correctAnswer === letter;

                          return (
                            <div
                              key={letter}
                              className={`p-3 rounded-lg border-2 ${
                                isCorrectAnswer
                                  ? 'border-green-500 bg-green-100 dark:bg-green-900/30'
                                  : isUserAnswer
                                  ? 'border-red-500 bg-red-100 dark:bg-red-900/30'
                                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                  {letter})
                                </span>
                                <span className="text-gray-700 dark:text-gray-300">{text}</span>
                                {isCorrectAnswer && (
                                  <span className="ml-auto px-2 py-1 text-xs font-semibold text-green-700 bg-green-200 dark:text-green-200 dark:bg-green-800 rounded">
                                    Correct
                                  </span>
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <span className="ml-auto px-2 py-1 text-xs font-semibold text-red-700 bg-red-200 dark:text-red-200 dark:bg-red-800 rounded">
                                    Your answer
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-between">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <RotateCcw size={18} />
              Retake Quiz
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div>
            <h2 className="text-2xl font-bold">{quiz.title}</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>

        {/* Question Content */}
        <div className="flex-1 overflow-auto px-8 py-8">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Question {currentQuestion.number}
            </h3>
            <p className="text-lg text-gray-700 dark:text-gray-300">{currentQuestion.question}</p>
          </div>

          <div className="space-y-3">
            {Object.entries(currentQuestion.options).map(([letter, text]) => {
              const isSelected = userAnswers[currentQuestion.number] === letter;
              
              return (
                <button
                  key={letter}
                  onClick={() => handleAnswerSelect(letter as 'A' | 'B' | 'C' | 'D')}
                  className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500'
                      : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600'
                          : 'border-gray-400 dark:border-gray-500'
                      }`}
                    >
                      {isSelected && <div className="w-3 h-3 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900 dark:text-white mr-2">
                        {letter})
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{text}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Answered: {answeredCount} / {totalQuestions}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={answeredCount === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  Submit Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InteractiveQuiz;

