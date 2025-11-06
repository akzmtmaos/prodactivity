import React, { useState, useEffect } from 'react';
import { X, BookOpen, Target, Brain, FileText, Upload, File } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateReviewer: (data: { title: string; sourceNotes: number[]; sourceNotebook: number | null; fileText?: string }) => void;
  onGenerateQuiz: (data: { title: string; sourceNotes: number[]; sourceNotebook: number | null; questionCount: number; fileText?: string }) => void;
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
  const [selectedSource, setSelectedSource] = useState<'note' | 'notebook' | 'file'>('note');
  const [selectedNotes, setSelectedNotes] = useState<number[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [autoTitleEnabled, setAutoTitleEnabled] = useState(true);
  
  // Quiz question count options
  const [questionCountOption, setQuestionCountOption] = useState<'10' | '20' | 'custom'>('10');
  const [customQuestionCount, setCustomQuestionCount] = useState<number>(10);
  
  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Auto-generate title based on selected notes
  useEffect(() => {
    if (autoTitleEnabled && selectedSource === 'note' && selectedNotes.length > 0) {
      const selectedNoteTitles = selectedNotes
        .map(id => notes.find(n => n.id === id)?.title)
        .filter(Boolean)
        .slice(0, 3); // Limit to first 3 notes for title
      
      if (selectedNoteTitles.length > 0) {
        if (selectedNoteTitles.length === 1) {
          setTitle(`${activeTab === 'reviewer' ? 'Reviewer' : 'Quiz'}: ${selectedNoteTitles[0]}`);
        } else if (selectedNoteTitles.length === 2) {
          setTitle(`${activeTab === 'reviewer' ? 'Reviewer' : 'Quiz'}: ${selectedNoteTitles[0]} & ${selectedNoteTitles[1]}`);
        } else {
          setTitle(`${activeTab === 'reviewer' ? 'Reviewer' : 'Quiz'}: ${selectedNoteTitles[0]}, ${selectedNoteTitles[1]}, and ${selectedNotes.length - 2} more`);
        }
      }
    } else if (autoTitleEnabled && selectedSource === 'notebook' && selectedNotebook) {
      const notebook = notebooks.find(n => n.id === selectedNotebook);
      if (notebook) {
        setTitle(`${activeTab === 'reviewer' ? 'Reviewer' : 'Quiz'}: ${notebook.name}`);
      }
    } else if (autoTitleEnabled && selectedSource === 'file' && uploadedFile) {
      const fileName = uploadedFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
      setTitle(`${activeTab === 'reviewer' ? 'Reviewer' : 'Quiz'}: ${fileName}`);
    }
  }, [selectedNotes, selectedNotebook, selectedSource, uploadedFile, activeTab, autoTitleEnabled, notes, notebooks]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFileUpload = async (file: File) => {
    setFileError('');
    setUploadingFile(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axiosInstance.post('/reviewers/upload/extract/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setExtractedText(response.data.text);
      setUploadedFile(file);
      
      // Auto-fill title with file name if title is empty
      if (!title) {
        const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        setTitle(fileName);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to extract text from file';
      setFileError(errorMsg);
      setUploadedFile(null);
      setExtractedText('');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleGenerate = () => {
    if (!title.trim()) return;
    
    if (activeTab === 'reviewer') {
      onGenerateReviewer({
        title: title.trim(),
        sourceNotes: selectedSource === 'note' ? selectedNotes : [],
        sourceNotebook: selectedSource === 'notebook' ? selectedNotebook : null,
        fileText: selectedSource === 'file' ? extractedText : undefined
      });
    } else {
      const questionCount = questionCountOption === 'custom' ? customQuestionCount : parseInt(questionCountOption);
      onGenerateQuiz({
        title: title.trim(),
        sourceNotes: selectedSource === 'note' ? selectedNotes : [],
        sourceNotebook: selectedSource === 'notebook' ? selectedNotebook : null,
        questionCount: questionCount,
        fileText: selectedSource === 'file' ? extractedText : undefined
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setSelectedNotes([]);
    setSelectedNotebook(null);
    setSelectedSource('note');
    setQuestionCountOption('10');
    setCustomQuestionCount(10);
    setUploadedFile(null);
    setExtractedText('');
    setFileError('');
    setIsDragging(false);
    setAutoTitleEnabled(true);
  };

  const handleNoteToggle = (noteId: number) => {
    setSelectedNotes(prev => {
      if (prev.includes(noteId)) {
        return prev.filter(id => id !== noteId);
      } else {
        return [...prev, noteId];
      }
    });
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoTitleEnabled}
                  onChange={(e) => setAutoTitleEnabled(e.target.checked)}
                  disabled={isLoading}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-xs text-gray-600">Auto-generate title</span>
              </label>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setAutoTitleEnabled(false); // Disable auto-title when user manually edits
              }}
              placeholder={`Enter ${activeTab} title...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            />
            {autoTitleEnabled && (
              <p className="mt-1 text-xs text-gray-500">
                Title will be auto-generated based on selected notes
              </p>
            )}
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
                  onChange={(e) => setSelectedSource(e.target.value as 'note' | 'notebook' | 'file')}
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
                  onChange={(e) => setSelectedSource(e.target.value as 'note' | 'notebook' | 'file')}
                  className="mr-2"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-700">Notebook</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="source"
                  value="file"
                  checked={selectedSource === 'file'}
                  onChange={(e) => setSelectedSource(e.target.value as 'note' | 'notebook' | 'file')}
                  className="mr-2"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-700">File</span>
              </label>
            </div>

            {/* Note Selection - Multiple Selection */}
            {selectedSource === 'note' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Notes (Multiple selection allowed)
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-2">
                  {notes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No notes available</p>
                  ) : (
                    notes.map(note => (
                      <label
                        key={note.id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedNotes.includes(note.id)}
                          onChange={() => handleNoteToggle(note.id)}
                          disabled={isLoading}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">{note.title}</span>
                          <span className="text-xs text-gray-500 ml-2">({note.notebook_name})</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {selectedNotes.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    {selectedNotes.length} note{selectedNotes.length > 1 ? 's' : ''} selected
                  </p>
                )}
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

            {/* File Upload */}
            {selectedSource === 'file' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File
                </label>
                
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50'
                      : uploadedFile
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300 bg-gray-50 hover:border-indigo-400'
                  } ${isLoading || uploadingFile ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.doc,.txt,.md,.markdown"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isLoading || uploadingFile}
                  />
                  
                  {uploadingFile ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                      <p className="text-sm text-gray-600">Extracting text from file...</p>
                    </div>
                  ) : uploadedFile ? (
                    <div className="flex flex-col items-center space-y-2">
                      <File className="h-10 w-10 text-green-600" />
                      <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {Math.round(uploadedFile.size / 1024)} KB • {extractedText.split(' ').length} words extracted
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                          setExtractedText('');
                          setFileError('');
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-700"
                        disabled={isLoading}
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="h-10 w-10 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">
                        Drop your file here or click to browse
                      </p>
                      <p className="text-xs text-gray-500">
                        Supports: PDF, DOCX, TXT, MD (Max 10MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* File Error */}
                {fileError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{fileError}</p>
                  </div>
                )}

                {/* Text Preview */}
                {extractedText && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Extracted Text Preview
                    </label>
                    <div className="max-h-32 overflow-y-auto p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">
                        {extractedText.slice(0, 500)}{extractedText.length > 500 ? '...' : ''}
                      </p>
                    </div>
                  </div>
                )}
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
            disabled={
              isLoading || 
              !title.trim() || 
              (selectedSource === 'note' && selectedNotes.length === 0) ||
              (selectedSource === 'notebook' && !selectedNotebook) ||
              (selectedSource === 'file' && !extractedText)
            }
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
