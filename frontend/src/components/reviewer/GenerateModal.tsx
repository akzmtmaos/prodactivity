import React, { useState } from 'react';
import { X, BookOpen, Target, Brain, FileText } from 'lucide-react';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateReviewer: (data: { title: string; sourceNote: number | null; sourceNotebook: number | null }) => void;
  onGenerateQuiz: (data: { title: string; sourceNote: number | null; sourceNotebook: number | null; questionCount: number }) => void;
  notes: Array<{ id: number; title: string; content: string; notebook_name: string; note_type?: string }>;
  notebooks: Array<{ id: number; name: string; notebook_type?: string }>;
  isLoading: boolean;
}

const GenerateModal: React.FC<GenerateModalProps> = ({
  isOpen,
  onClose,
  onGenerateReviewer,
  onGenerateQuiz,
  notes,
  notebooks,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<'reviewer' | 'quiz'>('reviewer');
  const [selectedSource, setSelectedSource] = useState<'note' | 'notebook'>('note');
  const [selectedNote, setSelectedNote] = useState<number | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  
  // Quiz question count options
  const [questionCountOption, setQuestionCountOption] = useState<'10' | '20' | 'custom'>('10');
  const [customQuestionCount, setCustomQuestionCount] = useState<number>(10);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleGenerate = () => {
    if (!title.trim()) return;
    
    if (activeTab === 'reviewer') {
      onGenerateReviewer({
        title: title.trim(),
        sourceNote: selectedSource === 'note' ? selectedNote : null,
        sourceNotebook: selectedSource === 'notebook' ? selectedNotebook : null
      });
    } else {
      const questionCount = questionCountOption === 'custom' ? customQuestionCount : parseInt(questionCountOption);
      onGenerateQuiz({
        title: title.trim(),
        sourceNote: selectedSource === 'note' ? selectedNote : null,
        sourceNotebook: selectedSource === 'notebook' ? selectedNotebook : null,
        questionCount: questionCount
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setSelectedNote(null);
    setSelectedNotebook(null);
    setSelectedSource('note');
    setQuestionCountOption('10');
    setCustomQuestionCount(10);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleBackdropClick}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Brain className="h-6 w-6 text-indigo-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Generate Content
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('reviewer')}
            className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 text-sm font-medium transition-colors ${
              activeTab === 'reviewer'
                ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            disabled={isLoading}
          >
            <BookOpen className="h-4 w-4" />
            <span>Reviewer</span>
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 text-sm font-medium transition-colors ${
              activeTab === 'quiz'
                ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            disabled={isLoading}
          >
            <Target className="h-4 w-4" />
            <span>Quiz</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${activeTab} title...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            />
          </div>

          {/* Source Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source
            </label>
            <div className="flex space-x-4 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="source"
                  value="note"
                  checked={selectedSource === 'note'}
                  onChange={(e) => setSelectedSource(e.target.value as 'note' | 'notebook')}
                  className="mr-2"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-700">Note</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="source"
                  value="notebook"
                  checked={selectedSource === 'notebook'}
                  onChange={(e) => setSelectedSource(e.target.value as 'note' | 'notebook')}
                  className="mr-2"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-700">Notebook</span>
              </label>
            </div>

            {/* Note Selection */}
            {selectedSource === 'note' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Note
                </label>
                <select
                  value={selectedNote || ''}
                  onChange={(e) => setSelectedNote(Number(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isLoading}
                >
                  <option value="">Choose a note...</option>
                  {notes.map(note => (
                    <option key={note.id} value={note.id}>
                      {note.title} ({note.notebook_name})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notebook Selection */}
            {selectedSource === 'notebook' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Notebook
                </label>
                <select
                  value={selectedNotebook || ''}
                  onChange={(e) => setSelectedNotebook(Number(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isLoading}
                >
                  <option value="">Choose a notebook...</option>
                  {notebooks.map(notebook => (
                    <option key={notebook.id} value={notebook.id}>
                      {notebook.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quiz Question Count Options - Only show for Quiz tab */}
          {activeTab === 'quiz' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Questions
              </label>
              <div className="space-y-3">
                {/* Option 1: 10 questions */}
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="questionCount"
                    value="10"
                    checked={questionCountOption === '10'}
                    onChange={(e) => setQuestionCountOption(e.target.value as '10' | '20' | 'custom')}
                    className="mr-3"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-700">10 questions (Standard)</span>
                </label>

                {/* Option 2: 20 questions */}
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="questionCount"
                    value="20"
                    checked={questionCountOption === '20'}
                    onChange={(e) => setQuestionCountOption(e.target.value as '10' | '20' | 'custom')}
                    className="mr-3"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-700">20 questions (Extended)</span>
                </label>

                {/* Option 3: Custom */}
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="questionCount"
                    value="custom"
                    checked={questionCountOption === 'custom'}
                    onChange={(e) => setQuestionCountOption(e.target.value as '10' | '20' | 'custom')}
                    className="mr-3"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-700">Custom (1-100 questions)</span>
                </label>

                {/* Custom input field */}
                {questionCountOption === 'custom' && (
                  <div className="ml-6 mt-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={customQuestionCount}
                      onChange={(e) => setCustomQuestionCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={isLoading}
                    />
                    <span className="ml-2 text-sm text-gray-500">questions</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {activeTab === 'reviewer' ? (
                  <BookOpen className="h-5 w-5 text-indigo-500 mt-0.5" />
                ) : (
                  <Target className="h-5 w-5 text-indigo-500 mt-0.5" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {activeTab === 'reviewer' ? 'Reviewer Generation' : 'Quiz Generation'}
                </h4>
                <p className="text-sm text-gray-600">
                  {activeTab === 'reviewer' 
                    ? 'Generate a comprehensive reviewer with summary, terminology, key points, and main ideas.'
                    : `Generate a quiz with ${questionCountOption === 'custom' ? customQuestionCount : questionCountOption} multiple choice questions using Bloom's Taxonomy for effective learning assessment.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !title.trim() || (!selectedNote && !selectedNotebook)}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </div>
            ) : (
              `Generate ${activeTab === 'reviewer' ? 'Reviewer' : 'Quiz'}`
            )}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateModal;
