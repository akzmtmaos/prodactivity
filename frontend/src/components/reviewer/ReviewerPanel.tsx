import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  FileText, 
  Brain, 
  Target, 
  Clock, 
  Map, 
  List, 
  Hash,
  Plus,
  Save,
  Trash2,
  Star,
  StarOff,
  Search,
  Filter,
  Download,
  Share2
} from 'lucide-react';
import axios from 'axios';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import ReviewerDocument from './ReviewerDocument';
import { useNavigate } from 'react-router-dom';
import ReviewerCard from './ReviewerCard';
import Toast from '../../components/common/Toast';

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

interface ReviewerPanelProps {
  notes: Array<{ id: number; title: string; content: string; notebook_name: string }>;
  notebooks: Array<{ id: number; name: string }>;
  activeTab: 'reviewer' | 'quiz';
  setActiveTab: (tab: 'reviewer' | 'quiz') => void;
}

const ReviewerPanel: React.FC<ReviewerPanelProps> = ({ notes, notebooks, activeTab, setActiveTab }) => {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'note' | 'notebook'>('note');
  const [selectedNote, setSelectedNote] = useState<number | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<number | null>(null);
  const [reviewerTitle, setReviewerTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizLoadingId, setQuizLoadingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';
  const REVIEWERS_URL = `${API_URL}/reviewers/`;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const navigate = useNavigate();

  // Fetch existing reviewers
  const fetchReviewers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(REVIEWERS_URL, {
        headers: getAuthHeaders()
      });
      setReviewers(response.data);
    } catch (error: any) {
      console.error('Failed to fetch reviewers:', error);
      setError('Failed to load reviewers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewers();
  }, []);

  // Generate AI reviewer
  const generateReviewer = async () => {
    if (!selectedNote && !selectedNotebook) {
      setError('Please select a note or notebook');
      return;
    }

    // Close the modal and show generating toast immediately
    setShowCreateForm(false);
    setToast({ message: 'Generating reviewer...', type: 'success' });

    try {
      setGenerating(true);
      setError(null);

      let sourceContent = '';
      let sourceTitle = '';

      if (selectedSource === 'note' && selectedNote) {
        const note = notes.find(n => n.id === selectedNote);
        if (note) {
          sourceContent = note.content;
          sourceTitle = note.title;
        }
      } else if (selectedSource === 'notebook' && selectedNotebook) {
        const notebook = notebooks.find(n => n.id === selectedNotebook);
        if (notebook) {
          const notebookNotes = notes.filter(n => n.notebook_name === notebook.name);
          sourceContent = notebookNotes.map(n => `${n.title}\n${n.content}`).join('\n\n');
          sourceTitle = notebook.name;
        }
      }

      if (!sourceContent) {
        setToast({ message: 'No content found in selected source', type: 'error' });
        setError('No content found in selected source');
        return;
      }

      // Compose a detailed prompt for the reviewer
      const detailedPrompt = `Please review the following content and provide your response in the following format:

Summary:

[Write a concise summary here]

Terminology:

- [List important terminologies with brief explanations as bullet points]

Key Points:

- [List key points and main ideas as bullet points]

Main Idea:

- [State the main idea(s) as bullet points]

Leave one blank line between each section. Use bullet points for lists.

Content:
${sourceContent}`;

      // Only one POST to /notes/ai-reviewer/
      const response = await axios.post(`${API_URL}/reviewers/ai/generate/`, {
        text: detailedPrompt,
        title: reviewerTitle || `${sourceTitle} - Study Summary`,
        source_note: selectedSource === 'note' ? selectedNote : null,
        source_notebook: selectedSource === 'notebook' ? selectedNotebook : null,
        tags: []
      }, {
        headers: getAuthHeaders()
      });

      setReviewers(prev => [response.data, ...prev]);
      setSelectedNote(null);
      setSelectedNotebook(null);
      setReviewerTitle('');
      setToast({ message: 'Reviewer generated successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Failed to generate reviewer:', error);
      setError(error.response?.data?.error || 'Failed to generate reviewer');
      setToast({ message: error.response?.data?.error || 'Failed to generate reviewer', type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (reviewerId: number) => {
    try {
      const reviewer = reviewers.find(r => r.id === reviewerId);
      if (!reviewer) return;

      const response = await axios.patch(`${REVIEWERS_URL}${reviewerId}/`, {
        is_favorite: !reviewer.is_favorite
      }, {
        headers: getAuthHeaders()
      });

      setReviewers(prev => prev.map(r => 
        r.id === reviewerId ? { ...r, is_favorite: response.data.is_favorite } : r
      ));
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);
      setError('Failed to update favorite status');
    }
  };

  // This DELETE request performs a soft delete (moves reviewer to Trash)
  const deleteReviewer = async (reviewerId: number) => {
    if (!window.confirm('Are you sure you want to delete this reviewer?')) return;
    try {
      await axios.delete(`${REVIEWERS_URL}${reviewerId}/`, {
        headers: getAuthHeaders()
      });
      setReviewers(prev => prev.filter(r => r.id !== reviewerId));
      setToast({ message: 'Reviewer moved to Trash.', type: 'success' });
    } catch (error: any) {
      console.error('Failed to delete reviewer:', error);
      setError('Failed to delete reviewer');
      setToast({ message: 'Failed to delete reviewer.', type: 'error' });
    }
  };

  // Filter reviewers
  const filteredReviewers = reviewers.filter(reviewer => {
    const matchesSearch = reviewer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reviewer.content.toLowerCase().includes(searchTerm.toLowerCase());
    const isQuiz = (reviewer.tags && reviewer.tags.includes('quiz')) || (reviewer.title && reviewer.title.toLowerCase().startsWith('quiz:'));
    return matchesSearch && !isQuiz;
  });

  // Filter quizzes
  const filteredQuizzes = reviewers.filter(reviewer => {
    const matchesSearch = reviewer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reviewer.content.toLowerCase().includes(searchTerm.toLowerCase());
    const isQuiz = (reviewer.tags && reviewer.tags.includes('quiz')) || (reviewer.title && reviewer.title.toLowerCase().startsWith('quiz:'));
    return matchesSearch && isQuiz;
  });

  // Add per-reviewer quiz generation state
  const generateQuizForReviewer = async (reviewer: Reviewer) => {
    setQuizLoadingId(reviewer.id);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/reviewers/ai/generate/`, {
        text: reviewer.content,
        title: `Quiz: ${reviewer.title}`
      }, {
        headers: getAuthHeaders()
      });
      const saveResponse = await axios.post(REVIEWERS_URL, {
        title: response.data.title,
        content: response.data.content,
        source_note: reviewer.source_note ?? null,
        source_notebook: reviewer.source_notebook ?? null,
        tags: ['quiz']
      }, {
        headers: getAuthHeaders()
      });
      setReviewers(prev => [saveResponse.data, ...prev]);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setQuizLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 h-full">
      {/* Sticky Header and Tabs */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reviewer</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Generate study materials from your notes</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 mt-4 sm:mt-0 justify-end w-full sm:w-auto">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search reviewers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 sm:w-64 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            {/* Filter Dropdown */}
            <select
              className="ml-2 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All</option>
              <option value="favorites">Favorites</option>
              <option value="notebook">By Notebook</option>
              <option value="note">By Note</option>
            </select>
            {/* Generate Reviewer Button */}
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Generate Reviewer
            </button>
          </div>
        </div>
        {/* Tabs styled like Schedule */}
        <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-2">
          <button
            onClick={() => { setActiveTab('reviewer'); navigate('/reviewer/r'); }}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
              activeTab === 'reviewer'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            Reviewer
          </button>
          <button
            onClick={() => { setActiveTab('quiz'); navigate('/reviewer/q'); }}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
              activeTab === 'quiz'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            Quiz
          </button>
        </div>
      </div>

      {/* Scrollable Tab Content */}
      <div className="overflow-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-indigo-400 scrollbar-track-gray-200 dark:scrollbar-thumb-indigo-600 dark:scrollbar-track-gray-800 px-1">
        {activeTab === 'reviewer' ? (
          <>
            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
                <button 
                  onClick={() => setError(null)}
                  className="ml-4 text-red-900 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            )}

            {/* Create Form */}
            {showCreateForm && ReactDOM.createPortal(
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 w-full max-w-md mx-auto">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Generate New Reviewer</h3>
                  
                  <div className="space-y-4">
                    {/* Source Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Source Type
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="note"
                            checked={selectedSource === 'note'}
                            onChange={(e) => setSelectedSource(e.target.value as 'note')}
                            className="mr-2"
                          />
                          Single Note
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="notebook"
                            checked={selectedSource === 'notebook'}
                            onChange={(e) => setSelectedSource(e.target.value as 'notebook')}
                            className="mr-2"
                          />
                          Entire Notebook
                        </label>
                      </div>
                    </div>

                    {/* Source Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {selectedSource === 'note' ? 'Select Note' : 'Select Notebook'}
                      </label>
                      <select
                        value={selectedSource === 'note' ? selectedNote || '' : selectedNotebook || ''}
                        onChange={(e) => {
                          if (selectedSource === 'note') {
                            setSelectedNote(Number(e.target.value) || null);
                          } else {
                            setSelectedNotebook(Number(e.target.value) || null);
                          }
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select {selectedSource === 'note' ? 'a note' : 'a notebook'}</option>
                        {selectedSource === 'note' 
                          ? notes.map(note => (
                              <option key={note.id} value={note.id}>
                                {note.title} ({note.notebook_name})
                              </option>
                            ))
                          : notebooks.map(notebook => (
                              <option key={notebook.id} value={notebook.id}>
                                {notebook.name}
                              </option>
                            ))
                        }
                      </select>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reviewer Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={reviewerTitle}
                        onChange={(e) => setReviewerTitle(e.target.value)}
                        placeholder="Leave empty for auto-generated title"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={generateReviewer}
                        disabled={generating || (!selectedNote && !selectedNotebook)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Brain size={16} className="mr-2" />
                            Generate Reviewer
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* Reviewers List */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading reviewers...</p>
              </div>
            ) : filteredReviewers.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm 
                    ? 'No reviewers match your search'
                    : 'No reviewers yet. Generate your first reviewer!'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredReviewers.map(reviewer => (
                  <ReviewerCard
                    key={reviewer.id}
                    reviewer={reviewer}
                    onFavorite={toggleFavorite}
                    onDelete={deleteReviewer}
                    onGenerateQuiz={generateQuizForReviewer}
                    onClick={() => navigate(`/reviewer/r/${reviewer.id}`)}
                    quizLoadingId={quizLoadingId}
                    showFavorite={true}
                    showGenerateQuiz={true}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading quizzes...</p>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm 
                  ? 'No quizzes match your search'
                  : 'No quizzes yet. Generate a quiz from a reviewer!'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredQuizzes.map(quiz => (
                <ReviewerCard
                  key={quiz.id}
                  reviewer={quiz}
                  onDelete={deleteReviewer}
                  onClick={() => navigate(`/reviewer/q/${quiz.id}`)}
                  showFavorite={false}
                  showGenerateQuiz={false}
                />
              ))}
            </div>
          )
        )}
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ReviewerPanel; 