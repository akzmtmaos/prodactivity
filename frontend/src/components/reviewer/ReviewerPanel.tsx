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
  Share2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import HelpButton from '../HelpButton';
import axiosInstance from '../../utils/axiosConfig';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import ReviewerDocument from './ReviewerDocument';
import { useNavigate } from 'react-router-dom';
import ReviewerCard from './ReviewerCard';
import Toast from '../../components/common/Toast';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import GenerateModal from './GenerateModal';
import InteractiveQuiz from './InteractiveQuiz';

interface Reviewer {
  id: number;
  title: string;
  content: string;
  source_note?: number | null;
  source_note_title?: string;
  source_note_notebook_id?: number | null;
  source_notebook?: number | null;
  source_notebook_name?: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  tags: string[];
  best_score?: number | null;
  best_score_correct?: number | null;
  best_score_total?: number | null;
}



interface ReviewerPanelProps {
  notes: Array<{ id: number; title: string; content: string; notebook_name: string; note_type?: string }>;
  notebooks: Array<{ id: number; name: string; notebook_type?: string }>;
  activeTab: 'reviewer' | 'quiz';
  setActiveTab: (tab: 'reviewer' | 'quiz') => void;
}

// Helper function to strip HTML and convert to plain text while preserving structure
const stripHtmlToText = (html: string): string => {
  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Process block elements to add line breaks
  const blockElements = temp.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div, li, br');
  blockElements.forEach(el => {
    if (el.tagName === 'BR') {
      el.replaceWith('\n');
    } else {
      // Add line break after block elements
      const text = el.textContent || '';
      if (text.trim()) {
        el.textContent = text + '\n';
      }
    }
  });
  
  // Get text content
  let text = temp.textContent || temp.innerText || '';
  
  // Clean up excessive whitespace but preserve line breaks
  text = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  return text;
};

const ReviewerPanel: React.FC<ReviewerPanelProps> = ({ notes, notebooks, activeTab, setActiveTab }) => {
  // Debug props
  console.log('ReviewerPanel props:', { notes, notebooks, activeTab });
  
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
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    reviewerId: number | null;
    reviewerTitle: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    reviewerId: null,
    reviewerTitle: '',
    isLoading: false
  });

  // Generate modal state
  const [generateModal, setGenerateModal] = useState<{
    isOpen: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    isLoading: false
  });

  // Bulk delete modal state
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{
    isOpen: boolean;
    selectedIds: number[];
    isLoading: boolean;
  }>({
    isOpen: false,
    selectedIds: [],
    isLoading: false
  });

  // Pagination state
  const [currentPageReviewer, setCurrentPageReviewer] = useState(1);
  const [currentPageQuiz, setCurrentPageQuiz] = useState(1);
  const itemsPerPage = 10; // Temporary: 10 items per page for testing

  // Interactive Quiz state
  const [interactiveQuizData, setInteractiveQuizData] = useState<Reviewer | null>(null);

  const navigate = useNavigate();

  // Fetch existing reviewers
  const fetchReviewers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching reviewers...');
      const response = await axiosInstance.get('/reviewers/');
      console.log('Reviewers response:', response.data);
      setReviewers(response.data || []);
    } catch (error: any) {
      console.error('Failed to fetch reviewers:', error);
      console.error('Error details:', error.response?.data);
      setError('Failed to load reviewers');
      setReviewers([]); // Set empty array on error
    } finally {
      setLoading(false);
      console.log('Fetch reviewers completed, loading set to false');
    }
  };

  useEffect(() => {
    fetchReviewers();
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Loading timeout reached, forcing loading to false');
        setLoading(false);
        setError('Loading timeout - please refresh the page');
      }
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(timeout);
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

      let sourceNoteType = null;
      let sourceNotebookType = null;

      if (selectedSource === 'note' && selectedNote && notes && Array.isArray(notes)) {
        const note = notes.find(n => n.id === selectedNote);
        if (note) {
          sourceContent = stripHtmlToText(note.content);
          sourceTitle = note.title;
          sourceNoteType = note.note_type;
        }
      } else if (selectedSource === 'notebook' && selectedNotebook && notebooks && Array.isArray(notebooks) && notes && Array.isArray(notes)) {
        const notebook = notebooks.find(n => n.id === selectedNotebook);
        if (notebook) {
          const notebookNotes = notes.filter(n => n.notebook_name === notebook.name);
          sourceContent = notebookNotes.map(n => `${n.title}\n${stripHtmlToText(n.content)}`).join('\n\n');
          sourceTitle = notebook.name;
          sourceNotebookType = notebook.notebook_type;
        }
      }

      if (!sourceContent) {
        setToast({ message: 'No content found in selected source', type: 'error' });
        setError('No content found in selected source');
        return;
      }

      // Only one POST to /reviewers/ai/generate/
      // Use longer timeout for AI generation (5 minutes)
      console.log('Starting reviewer generation...');
      const response = await axiosInstance.post('/reviewers/ai/generate/', {
        text: sourceContent, // Send raw content instead of pre-formatted prompt
        title: reviewerTitle || `${sourceTitle} - Study Summary`,
        source_note: selectedSource === 'note' ? selectedNote : null,
        source_notebook: selectedSource === 'notebook' ? selectedNotebook : null,
        note_type: sourceNoteType || sourceNotebookType, // Send note/notebook type for context
        tags: []
      }, {
        timeout: 300000 // 5 minutes timeout for AI generation
      });

      console.log('Reviewer generation response:', response);
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);

      // Fetch the newly created reviewer with source titles
      const createdReviewerId = response.data.id;
      const reviewerResponse = await axiosInstance.get(`/reviewers/${createdReviewerId}/`);
      
      // Success! Add to list and show success message
      setReviewers(prev => [reviewerResponse.data, ...prev]);
      setSelectedNote(null);
      setSelectedNotebook(null);
      setReviewerTitle('');
      setToast({ message: 'Reviewer generated successfully!', type: 'success' });
      
      console.log('Generate reviewer completed successfully!');
    } catch (error: any) {
      console.error('Failed to generate reviewer - CAUGHT ERROR:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      setError(error.response?.data?.error || 'Failed to generate reviewer');
      setToast({ message: error.response?.data?.error || 'Failed to generate reviewer', type: 'error' });
    } finally {
      console.log('Setting generating to false');
      setGenerating(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (reviewerId: number) => {
    try {
      const reviewer = reviewers.find(r => r.id === reviewerId);
      if (!reviewer) return;

      const response = await axiosInstance.patch(`/reviewers/${reviewerId}/`, {
        is_favorite: !reviewer.is_favorite
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
  // Open delete confirmation modal
  const openDeleteModal = (reviewerId: number, reviewerTitle: string) => {
    setDeleteModal({
      isOpen: true,
      reviewerId,
      reviewerTitle,
      isLoading: false
    });
  };

  // Close delete confirmation modal
  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      reviewerId: null,
      reviewerTitle: '',
      isLoading: false
    });
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (!deleteModal.reviewerId) return;
    
    setDeleteModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      await axiosInstance.delete(`/reviewers/${deleteModal.reviewerId}/`);
      setReviewers(prev => prev.filter(r => r.id !== deleteModal.reviewerId));
      setToast({ message: 'Reviewer moved to Trash.', type: 'success' });
      closeDeleteModal();
    } catch (error: any) {
      console.error('Failed to delete reviewer:', error);
      setError('Failed to delete reviewer');
      setToast({ message: 'Failed to delete reviewer.', type: 'error' });
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Generate modal functions
  const openGenerateModal = () => {
    setGenerateModal({ isOpen: true, isLoading: false });
  };

  const closeGenerateModal = () => {
    setGenerateModal({ isOpen: false, isLoading: false });
  };

  // Bulk delete modal functions
  const openBulkDeleteModal = () => {
    setBulkDeleteModal({
      isOpen: true,
      selectedIds: [],
      isLoading: false
    });
  };

  const closeBulkDeleteModal = () => {
    setBulkDeleteModal({
      isOpen: false,
      selectedIds: [],
      isLoading: false
    });
  };

  // Toggle item selection in bulk delete modal
  const toggleBulkDeleteSelection = (id: number) => {
    setBulkDeleteModal(prev => ({
      ...prev,
      selectedIds: prev.selectedIds.includes(id)
        ? prev.selectedIds.filter(selectedId => selectedId !== id)
        : [...prev.selectedIds, id]
    }));
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (bulkDeleteModal.selectedIds.length === 0) return;
    
    setBulkDeleteModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Delete all selected reviewers in parallel
      await Promise.all(
        bulkDeleteModal.selectedIds.map(id => axiosInstance.delete(`/reviewers/${id}/`))
      );
      
      // Remove deleted reviewers from state
      setReviewers(prev => prev.filter(r => !bulkDeleteModal.selectedIds.includes(r.id)));
      
      const count = bulkDeleteModal.selectedIds.length;
      setToast({ 
        message: `${count} ${activeTab === 'reviewer' ? 'reviewer' : 'quiz'}${count > 1 ? 's' : ''} deleted successfully!`, 
        type: 'success' 
      });
      
      closeBulkDeleteModal();
    } catch (error: any) {
      console.error('Failed to bulk delete:', error);
      setToast({ message: 'Failed to delete some items', type: 'error' });
      setBulkDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleGenerateReviewer = async (data: { title: string; sourceNote: number | null; sourceNotebook: number | null; fileText?: string }) => {
    setGenerateModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      let textContent = '';
      let noteType = null;
      
      if (data.fileText) {
        // Use extracted text from uploaded file
        textContent = data.fileText;
      } else {
        // Get content from note or notebook
        const sourceNote = notes.find(n => n.id === data.sourceNote);
        const sourceNotebook = notebooks.find(n => n.id === data.sourceNotebook);
        
        if (sourceNote) {
          textContent = stripHtmlToText(sourceNote.content);
          noteType = sourceNote.note_type;
        } else if (sourceNotebook) {
          const notebookNotes = notes.filter(n => n.notebook_name === sourceNotebook.name);
          textContent = notebookNotes.map(n => `${n.title}\n${stripHtmlToText(n.content)}`).join('\n\n');
          noteType = sourceNotebook.notebook_type;
        }
      }
      
      const response = await axiosInstance.post('/reviewers/ai/generate/', {
        text: textContent,
        title: data.title,
        source_note: data.sourceNote,
        source_notebook: data.sourceNotebook,
        note_type: noteType
      }, {
        timeout: 300000 // 5 minutes timeout for AI generation
      });

      // Fetch the newly created reviewer with source titles
      const createdReviewerId = response.data.id;
      const reviewerResponse = await axiosInstance.get(`/reviewers/${createdReviewerId}/`);
      
      setReviewers(prev => [reviewerResponse.data, ...prev]);
      setToast({ message: 'Reviewer generated successfully!', type: 'success' });
      closeGenerateModal();
    } catch (error: any) {
      console.error('Failed to generate reviewer:', error);
      setError('Failed to generate reviewer');
      setToast({ message: 'Failed to generate reviewer.', type: 'error' });
      setGenerateModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleGenerateQuiz = async (data: { title: string; sourceNote: number | null; sourceNotebook: number | null; questionCount: number; fileText?: string }) => {
    setGenerateModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      let sourceContent = '';
      let noteType = null;
      
      if (data.fileText) {
        // Use extracted text from uploaded file
        sourceContent = data.fileText;
      } else {
        // Get content from note or notebook
        const sourceNote = notes.find(n => n.id === data.sourceNote);
        const sourceNotebook = notebooks.find(n => n.id === data.sourceNotebook);

        if (sourceNote) {
          sourceContent = stripHtmlToText(sourceNote.content);
          noteType = sourceNote.note_type;
        } else if (sourceNotebook) {
          const notebookNotes = notes.filter(n => n.notebook_name === sourceNotebook.name);
          sourceContent = notebookNotes.map(n => `${n.title}\n${stripHtmlToText(n.content)}`).join('\n\n');
          noteType = sourceNotebook.notebook_type;
        }
      }

      const response = await axiosInstance.post('/reviewers/ai/generate/', {
        text: sourceContent,
        title: `Quiz: ${data.title}`,
        source_note: data.sourceNote,
        source_notebook: data.sourceNotebook,
        note_type: noteType,
        question_count: data.questionCount
      }, {
        timeout: 300000 // 5 minutes timeout for AI generation
      });

      // Fetch the newly created quiz with source titles
      const createdQuizId = response.data.id;
      const quizResponse = await axiosInstance.get(`/reviewers/${createdQuizId}/`);
      
      setReviewers(prev => [quizResponse.data, ...prev]);
      setToast({ message: 'Quiz generated successfully!', type: 'success' });
      closeGenerateModal();
    } catch (error: any) {
      console.error('Failed to generate quiz:', error);
      setError('Failed to generate quiz');
      setToast({ message: 'Failed to generate quiz.', type: 'error' });
      setGenerateModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Filter reviewers
  const filteredReviewers = reviewers && Array.isArray(reviewers) ? reviewers.filter(reviewer => {
    const matchesSearch = reviewer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reviewer.content.toLowerCase().includes(searchTerm.toLowerCase());
    const isQuiz = (reviewer.tags && reviewer.tags.includes('quiz')) || (reviewer.title && reviewer.title.toLowerCase().startsWith('quiz:'));
    
    let matchesFilter = true;
    if (filterType === 'all') {
      matchesFilter = true;
    } else if (filterType === 'favorites') {
      matchesFilter = reviewer.is_favorite;
    } else if (filterType === 'notebook') {
      matchesFilter = reviewer.source_notebook != null;
    } else if (filterType === 'note') {
      matchesFilter = reviewer.source_note != null;
    }
    
    return matchesSearch && !isQuiz && matchesFilter;
  }) : [];

  // Filter quizzes
  const filteredQuizzes = reviewers && Array.isArray(reviewers) ? reviewers.filter(reviewer => {
    const matchesSearch = reviewer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reviewer.content.toLowerCase().includes(searchTerm.toLowerCase());
    const isQuiz = (reviewer.tags && reviewer.tags.includes('quiz')) || (reviewer.title && reviewer.title.toLowerCase().startsWith('quiz:'));
    
    let matchesFilter = true;
    if (filterType === 'all') {
      matchesFilter = true;
    } else if (filterType === 'favorites') {
      matchesFilter = reviewer.is_favorite;
    } else if (filterType === 'notebook') {
      matchesFilter = reviewer.source_notebook != null;
    } else if (filterType === 'note') {
      matchesFilter = reviewer.source_note != null;
    }
    
    return matchesSearch && isQuiz && matchesFilter;
  }) : [];

  // Pagination logic for reviewers
  const totalPagesReviewer = Math.ceil(filteredReviewers.length / itemsPerPage);
  const startIndexReviewer = (currentPageReviewer - 1) * itemsPerPage;
  const endIndexReviewer = startIndexReviewer + itemsPerPage;
  const paginatedReviewers = filteredReviewers.slice(startIndexReviewer, endIndexReviewer);

  // Pagination logic for quizzes
  const totalPagesQuiz = Math.ceil(filteredQuizzes.length / itemsPerPage);
  const startIndexQuiz = (currentPageQuiz - 1) * itemsPerPage;
  const endIndexQuiz = startIndexQuiz + itemsPerPage;
  const paginatedQuizzes = filteredQuizzes.slice(startIndexQuiz, endIndexQuiz);

  // Reset pagination when search/filter changes
  useEffect(() => {
    setCurrentPageReviewer(1);
  }, [searchTerm, filterType]);

  useEffect(() => {
    setCurrentPageQuiz(1);
  }, [searchTerm, filterType]);

  // Add per-reviewer quiz generation state
  const generateQuizForReviewer = async (reviewer: Reviewer) => {
    setQuizLoadingId(reviewer.id);
    setError(null);
    try {
      const response = await axiosInstance.post('/reviewers/ai/generate/', {
        text: reviewer.content,
        title: `Quiz: ${reviewer.title}`,
        note_type: reviewer.source_note ? 
          (notes.find(n => n.id === reviewer.source_note)?.note_type) : 
          (reviewer.source_notebook ? 
            (notebooks.find(n => n.id === reviewer.source_notebook)?.notebook_type) : 
            null)
      });
      const saveResponse = await axiosInstance.post('/reviewers/', {
        title: response.data.title,
        content: response.data.content,
        source_note: reviewer.source_note ?? null,
        source_notebook: reviewer.source_notebook ?? null,
        tags: ['quiz']
      });
            setReviewers(prev => [saveResponse.data, ...prev]);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setQuizLoadingId(null);
    }
  };

  // Handle score update callback from InteractiveQuiz
  const handleScoreUpdate = async (quizId: number, score: number) => {
    // DON'T update state while quiz is still open
    // The update will happen when the quiz modal closes
    console.log(`✅ Quiz ${quizId} score will be refreshed when quiz closes`);
  };

  // Debug loading state
  console.log('Loading state:', {
    loading,
    hasNotes: notes && Array.isArray(notes) && notes.length > 0,
    hasNotebooks: notebooks && Array.isArray(notebooks) && notebooks.length > 0,
    hasReviewers: reviewers && Array.isArray(reviewers) && reviewers.length > 0,
    notesLength: notes?.length || 0,
    notebooksLength: notebooks?.length || 0,
    reviewersLength: reviewers?.length || 0
  });
  
  // Debug data content
  if (notes && Array.isArray(notes) && notes.length > 0) {
    console.log('First note sample:', notes[0]);
  } else {
    console.log('Notes data:', notes);
  }
  if (notebooks && Array.isArray(notebooks) && notebooks.length > 0) {
    console.log('First notebook sample:', notebooks[0]);
  } else {
    console.log('Notebooks data:', notebooks);
  }
  if (reviewers && Array.isArray(reviewers) && reviewers.length > 0) {
    console.log('First reviewer sample:', reviewers[0]);
  } else {
    console.log('Reviewers data:', reviewers);
  }

  // Don't render until reviewers are loaded (notes/notebooks are optional for display)
  if (loading) {
    return (
      <div className="space-y-6 h-full">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Loading reviewers... (Notes: {notes?.length || 0}, Notebooks: {notebooks?.length || 0}, Reviewers: {reviewers?.length || 0})
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      {/* Sticky Header and Tabs */}
      <div className="bg-transparent dark:bg-transparent pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              Reviewer
              <HelpButton 
                content={
                  <div>
                    <p className="font-semibold mb-2">Reviewer & Study Materials</p>
                    <ul className="space-y-1 text-xs">
                      <li>• <strong>Generate Reviewers:</strong> Create study materials from your notes</li>
                      <li>• <strong>AI-Powered:</strong> Intelligent content generation and summarization</li>
                      <li>• <strong>Multiple Formats:</strong> Questions, summaries, and study guides</li>
                      <li>• <strong>Source Tracking:</strong> See which notes were used to create reviewers</li>
                      <li>• <strong>Favorites:</strong> Mark important reviewers for quick access</li>
                      <li>• <strong>Tags:</strong> Organize reviewers by topic or subject</li>
                      <li>• <strong>Export:</strong> Download reviewers for offline study</li>
                    </ul>
                  </div>
                } 
                title="Reviewer Help" 
              />
            </h1>
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
                className="w-48 sm:w-64 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent dark:bg-transparent text-gray-900 dark:text-white placeholder-gray-500"
              />
            </div>
            {/* Filter Dropdown */}
            <select
              className="ml-2 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent dark:bg-transparent text-gray-900 dark:text-white"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All</option>
              <option value="favorites">Favorites</option>
              <option value="notebook">By Notebook</option>
              <option value="note">By Note</option>
            </select>
            {/* Bulk Delete Button */}
            <button
              onClick={openBulkDeleteModal}
              className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-colors"
              title={`Delete multiple ${activeTab === 'reviewer' ? 'reviewers' : 'quizzes'}`}
            >
              <Trash2 size={18} />
            </button>
            {/* Generate Button */}
            <button
              onClick={openGenerateModal}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Generate
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
                          ? (notes && Array.isArray(notes) ? notes.map(note => {
                              console.log('Note option:', note);
                              return (
                                <option key={note.id} value={note.id}>
                                  {note.title} ({note.notebook_name || 'No notebook'})
                                </option>
                              );
                            }) : [])
                          : (notebooks && Array.isArray(notebooks) ? notebooks.map(notebook => { 
                              console.log('Notebook option:', notebook);
                              return (
                                <option key={notebook.id} value={notebook.id}>
                                  {notebook.name}
                                </option>
                              );
                            }) : [])
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
                            Generate
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
                {paginatedReviewers.map(reviewer => (
                  <ReviewerCard
                    key={reviewer.id}
                    reviewer={reviewer}
                    onFavorite={toggleFavorite}
                    onDelete={(id) => {
                      const reviewer = reviewers.find(r => r.id === id);
                      if (reviewer) {
                        openDeleteModal(id, reviewer.title);
                      }
                    }}
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
              {paginatedQuizzes.map(quiz => {
                // Debug: Log quiz source data and best_score
                if (quiz.id) {
                  console.log(`Quiz ${quiz.id} data:`, {
                    title: quiz.title,
                    best_score: quiz.best_score,
                    source_note: quiz.source_note,
                    source_note_title: quiz.source_note_title,
                    source_note_notebook_id: quiz.source_note_notebook_id,
                    source_notebook: quiz.source_notebook,
                    source_notebook_name: quiz.source_notebook_name
                  });
                }
                
                return (
                  <ReviewerCard
                    key={quiz.id}
                    reviewer={quiz}
                    onDelete={(id) => {
                      const reviewer = reviewers.find(r => r.id === id);
                      if (reviewer) {
                        openDeleteModal(id, reviewer.title);
                      }
                    }}
                    onClick={() => navigate(`/reviewer/q/${quiz.id}`)}
                    onTakeQuiz={(quiz) => setInteractiveQuizData(quiz)}
                    showFavorite={false}
                    showGenerateQuiz={false}
                    showTakeQuiz={true}
                  />
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Pagination Controls - Outside Scrollable Area */}
      {activeTab === 'reviewer' && totalPagesReviewer > 1 && (
        <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndexReviewer + 1}-{Math.min(endIndexReviewer, filteredReviewers.length)} of {filteredReviewers.length} reviewers
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPageReviewer(prev => Math.max(1, prev - 1))}
              disabled={currentPageReviewer === 1}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Page {currentPageReviewer} of {totalPagesReviewer}
            </span>
            <button
              onClick={() => setCurrentPageReviewer(prev => Math.min(totalPagesReviewer, prev + 1))}
              disabled={currentPageReviewer === totalPagesReviewer}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'quiz' && totalPagesQuiz > 1 && (
        <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndexQuiz + 1}-{Math.min(endIndexQuiz, filteredQuizzes.length)} of {filteredQuizzes.length} quizzes
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPageQuiz(prev => Math.max(1, prev - 1))}
              disabled={currentPageQuiz === 1}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Page {currentPageQuiz} of {totalPagesQuiz}
            </span>
            <button
              onClick={() => setCurrentPageQuiz(prev => Math.min(totalPagesQuiz, prev + 1))}
              disabled={currentPageQuiz === totalPagesQuiz}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Reviewer"
        itemName={deleteModal.reviewerTitle}
        isLoading={deleteModal.isLoading}
      />
      
      {/* Generate Modal */}
      <GenerateModal
        isOpen={generateModal.isOpen}
        onClose={closeGenerateModal}
        onGenerateReviewer={handleGenerateReviewer}
        onGenerateQuiz={handleGenerateQuiz}
        notes={notes}
        notebooks={notebooks}
        isLoading={generateModal.isLoading}
      />

      {/* Bulk Delete Modal */}
      {bulkDeleteModal.isOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete {activeTab === 'reviewer' ? 'Reviewers' : 'Quizzes'}
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                onClick={closeBulkDeleteModal}
                disabled={bulkDeleteModal.isLoading}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select {activeTab === 'reviewer' ? 'reviewers' : 'quizzes'} to delete. This action cannot be undone.
              </p>
              <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                {(activeTab === 'reviewer' ? filteredReviewers : filteredQuizzes).map((item) => (
                  <label 
                    key={item.id} 
                    className="flex items-start gap-3 p-4 border-b last:border-b-0 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      checked={bulkDeleteModal.selectedIds.includes(item.id)}
                      onChange={() => toggleBulkDeleteSelection(item.id)}
                      disabled={bulkDeleteModal.isLoading}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white line-clamp-1">
                        {item.title || 'Untitled'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                        {item.content.substring(0, 150)}...
                      </div>
                      {(item.source_note_title || item.source_notebook_name) && (
                        <div className="text-xs text-gray-400 mt-1">
                          Source: {item.source_note_title || item.source_notebook_name}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </div>
                  </label>
                ))}
                {(activeTab === 'reviewer' ? filteredReviewers : filteredQuizzes).length === 0 && (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No {activeTab === 'reviewer' ? 'reviewers' : 'quizzes'} available.
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
              <button
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={closeBulkDeleteModal}
                disabled={bulkDeleteModal.isLoading}
              >
                Cancel
              </button>
              <button
                disabled={bulkDeleteModal.selectedIds.length === 0 || bulkDeleteModal.isLoading}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                onClick={confirmBulkDelete}
              >
                {bulkDeleteModal.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    Delete {bulkDeleteModal.selectedIds.length > 0 ? `(${bulkDeleteModal.selectedIds.length})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Interactive Quiz Modal */}
      {interactiveQuizData && (
        <InteractiveQuiz
          quiz={interactiveQuizData}
          onClose={() => {
            setInteractiveQuizData(null);
            // Refresh reviewers list to show updated best score
            fetchReviewers();
          }}
          onScoreUpdate={handleScoreUpdate}
        />
      )}
    </div>
  );
};

export default ReviewerPanel; 