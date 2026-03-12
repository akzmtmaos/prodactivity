import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import TrashList from '../components/trash/TrashList';
import Toast from '../components/common/Toast';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';
import { Trash2, ChevronDown, Search, RotateCcw, X } from 'lucide-react';
import Pagination from '../components/common/Pagination';
import axiosInstance from '../utils/axiosConfig';
import { API_BASE_URL } from '../config/api';
import { supabase } from '../lib/supabase';

// Define TrashItem type here for use in state
export type TrashItem = {
  id: string;
  type: 'note' | 'deck' | 'notebook' | 'reviewer' | 'task' | 'flashcard' | 'quiz';
  title: string;
  deletedAt: string;
  tags?: string[]; // Optional tags for filtering quizzes from reviewers
};

const TABS = ['all', 'filter'] as const;
type TabType = typeof TABS[number];

const ITEM_TYPES = ['notebooks', 'notes', 'decks', 'flashcards', 'reviewer', 'quiz', 'tasks'] as const;
type ItemType = typeof ITEM_TYPES[number];

const ITEMS_PER_PAGE = 10;

const Trash = () => {
  const { tab } = useParams<{ tab?: TabType }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [notes, setNotes] = useState<TrashItem[]>([]);
  const [decks, setDecks] = useState<TrashItem[]>([]);
  const [notebooks, setNotebooks] = useState<TrashItem[]>([]);
  const [reviewers, setReviewers] = useState<TrashItem[]>([]);
  const [tasks, setTasks] = useState<TrashItem[]>([]);
  const [flashcards, setFlashcards] = useState<TrashItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(tab && TABS.includes(tab) ? tab : 'all');
  const [selectedTypes, setSelectedTypes] = useState<Set<ItemType>>(new Set<ItemType>(['notebooks' as ItemType]));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; type: 'note' | 'deck' | 'notebook' | 'reviewer' | 'task' | 'flashcard' | 'quiz'; title: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'note' | 'deck' | 'notebook' | 'reviewer' | 'task' | 'flashcard' | 'quiz'; title: string } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [showRestoreSelectedModal, setShowRestoreSelectedModal] = useState(false);
  const [restoreSelectedLoading, setRestoreSelectedLoading] = useState(false);
  const [deleteSelectedLoading, setDeleteSelectedLoading] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync activeTab with URL param
  useEffect(() => {
    // Check if URL param is a valid tab type
    if (tab && TABS.includes(tab as TabType)) {
      setActiveTab(tab as TabType);
    } else if (tab && ITEM_TYPES.includes(tab as ItemType)) {
      // If it's an old-style type tab (notes, decks, etc.), convert to filter tab
      setSelectedTypes(new Set([tab as ItemType]));
      setActiveTab('filter');
      navigate('/trash/filter'); // Update URL to new format
    } else {
      setActiveTab('all');
    }
  }, [tab, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser && parsedUser.username) {
          setUser(parsedUser);
        } else {
          setUser({ username: 'User' });
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
        setUser({ username: 'User' });
      }
    } else {
      setUser({ username: 'User' });
    }
  }, []);

  const fetchTrash = async () => {
    setLoading(true);
    try {

      // Fetch deleted notes
      const notesRes = await axiosInstance.get('/trash/notes/');
      const notesData = notesRes.data;
      setNotes(
        notesData.map((note: any) => ({
          id: note.id,
          type: 'note',
          title: note.title,
          deletedAt: note.deleted_at || note.updated_at || '',
        }))
      );

      // Fetch deleted decks
      const decksRes = await axiosInstance.get('/trash/decks/');
      const decksData = decksRes.data;
      setDecks(
        decksData.map((deck: any) => ({
          id: deck.id,
          type: 'deck',
          title: deck.title,
          deletedAt: deck.deleted_at || deck.updated_at || '',
        }))
      );

      // Fetch deleted notebooks
      try {
        console.log('Fetching deleted notebooks from:', `${API_BASE_URL}/notes/notebooks/?is_deleted=true`);
        const notebooksRes = await axiosInstance.get('/notes/notebooks/?is_deleted=true');
        const notebooksData = notebooksRes.data;
        console.log('Raw notebooks data:', notebooksData);
        
        const notebooksList = notebooksData.results || notebooksData;
        console.log('Processed notebooks list:', notebooksList);
        
        setNotebooks(
          notebooksList.map((notebook: any) => ({
            id: notebook.id,
            type: 'notebook',
            title: notebook.name,
            deletedAt: notebook.deleted_at || notebook.updated_at || '',
          }))
        );
      } catch (error) {
        console.error('Failed to fetch deleted notebooks:', error);
        setNotebooks([]);
      }

      // Fetch deleted reviewers
      const reviewersRes = await axiosInstance.get('/trash/reviewers/');
      const reviewersData = reviewersRes.data;
      setReviewers(
        reviewersData.map((reviewer: any) => ({
          id: reviewer.id,
          type: 'reviewer',
          title: reviewer.title,
          deletedAt: reviewer.deleted_at || reviewer.updated_at || '',
          tags: reviewer.tags || [], // Store tags to filter quizzes
        }))
      );

      // Fetch deleted flashcards from Supabase
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          const userId = typeof parsedUser.id === 'number' ? parsedUser.id : parseInt(parsedUser.id, 10);

          if (!Number.isNaN(userId)) {
            const { data: flashcardsData, error: flashcardsError } = await supabase
              .from('flashcards')
              .select('*')
              .eq('user_id', userId)
              .eq('is_deleted', true);

            if (flashcardsError) {
              console.error('Failed to fetch deleted flashcards from Supabase:', flashcardsError);
              setFlashcards([]);
            } else {
              setFlashcards(
                (flashcardsData || []).map((flashcard: any) => ({
                  id: flashcard.id.toString(),
                  type: 'flashcard' as const,
                  title: flashcard.front ? `${flashcard.front.substring(0, 50)}${flashcard.front.length > 50 ? '...' : ''}` : 'Untitled Flashcard',
                  deletedAt: flashcard.deleted_at || flashcard.updated_at || '',
                }))
              );
            }
          } else {
            setFlashcards([]);
          }
        } else {
          setFlashcards([]);
        }
      } catch (error) {
        console.error('Unexpected error while fetching deleted flashcards from Supabase:', error);
        setFlashcards([]);
      }

      // Fetch deleted tasks from Supabase
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          const userId = typeof parsedUser.id === 'number' ? parsedUser.id : parseInt(parsedUser.id, 10);

          if (!Number.isNaN(userId)) {
            const { data: tasksData, error: tasksError } = await supabase
              .from('tasks')
              .select('*')
              .eq('user_id', userId)
              .eq('is_deleted', true);

            if (tasksError) {
              console.error('Failed to fetch deleted tasks from Supabase:', tasksError);
              setTasks([]);
            } else {
              setTasks(
                (tasksData || []).map((task: any) => ({
                  id: task.id.toString(),
                  type: 'task' as const,
                  title: task.title,
                  deletedAt: task.deleted_at || task.updated_at || '',
                }))
              );
            }
          } else {
            setTasks([]);
          }
        } else {
          setTasks([]);
        }
      } catch (error) {
        console.error('Unexpected error while fetching deleted tasks from Supabase:', error);
        setTasks([]);
      }
    } catch (error) {
      console.error('Failed to fetch trash data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    // Don't clear selection when tab changes - keep items selected across tabs
  }, [activeTab, selectedTypes, notes, decks, notebooks, reviewers, tasks, flashcards]);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'all') {
      navigate('/trash/all');
    } else {
      navigate(`/trash/filter`);
    }
  };

  const handleTypeToggle = (type: ItemType) => {
    const newSelectedTypes = new Set(selectedTypes);
    if (newSelectedTypes.has(type)) {
      newSelectedTypes.delete(type);
      // Ensure at least one type is selected
      if (newSelectedTypes.size === 0) {
        return; // Don't allow deselecting all types
      }
    } else {
      newSelectedTypes.add(type);
    }
    setSelectedTypes(newSelectedTypes);
    setCurrentPage(1); // Reset to first page when type changes
  };

  const handleRestore = async (id: string, type: 'note' | 'deck' | 'notebook' | 'reviewer' | 'task' | 'flashcard' | 'quiz') => {
    setRestoreTarget({ id, type, title: (filteredItems.find(i => i.id === id)?.title) || '' });
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    const { id, type } = restoreTarget;
    let endpoint = '';
    if (type === 'note') endpoint = `/notes/${id}/`;
    if (type === 'deck') endpoint = `/decks/decks/${id}/`;
    if (type === 'notebook') endpoint = `/notes/notebooks/${id}/`;
    if (type === 'reviewer') endpoint = `/reviewers/${id}/`;
    if (type === 'quiz') endpoint = `/reviewers/${id}/`; // Quiz is a reviewer with quiz tag
    try {
      if (type === 'task') {
        const numericId = parseInt(id, 10);
        if (!Number.isNaN(numericId)) {
          const { error } = await supabase
            .from('tasks')
            .update({ is_deleted: false, deleted_at: null })
            .eq('id', numericId);

          if (error) {
            throw error;
          }
        }
      } else if (type === 'flashcard') {
        const numericId = parseInt(id, 10);
        if (!Number.isNaN(numericId)) {
          const { error } = await supabase
            .from('flashcards')
            .update({ is_deleted: false, deleted_at: null })
            .eq('id', numericId);

          if (error) {
            throw error;
          }
        }
      } else {
        await axiosInstance.patch(endpoint, { is_deleted: false, deleted_at: null });
      }
      fetchTrash();
      setToast({ message: 'Item restored successfully!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to restore item.', type: 'error' });
      console.error('Failed to restore item:', error);
    } finally {
      setShowRestoreModal(false);
      setRestoreTarget(null);
    }
  };

  const handleDelete = async (id: string, type: 'note' | 'deck' | 'notebook' | 'reviewer' | 'task' | 'flashcard' | 'quiz') => {
    setDeleteTarget({ id, type, title: (filteredItems.find(i => i.id === id)?.title) || '' });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, type } = deleteTarget;
    let endpoint = '';
    if (type === 'note') endpoint = `/notes/${id}/`;
    if (type === 'deck') endpoint = `/decks/decks/${id}/`;
    if (type === 'notebook') endpoint = `/notes/notebooks/${id}/`;
    if (type === 'reviewer') endpoint = `/reviewers/${id}/`;
    if (type === 'quiz') endpoint = `/reviewers/${id}/`; // Quiz is a reviewer with quiz tag
    try {
      if (type === 'task') {
        const numericId = parseInt(id, 10);
        if (!Number.isNaN(numericId)) {
          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', numericId);

          if (error) {
            throw error;
          }
        }
      } else if (type === 'flashcard') {
        const numericId = parseInt(id, 10);
        if (!Number.isNaN(numericId)) {
          const { error } = await supabase
            .from('flashcards')
            .delete()
            .eq('id', numericId);

          if (error) {
            throw error;
          }
        }
      } else {
        await axiosInstance.delete(endpoint);
      }
      fetchTrash();
      setToast({ message: 'Item permanently deleted.', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to permanently delete item.', type: 'error' });
      console.error('Failed to permanently delete item:', error);
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleDeleteAll = async () => {
    setShowDeleteAllModal(false);
    for (const item of filteredItems) {
      let endpoint = '';
      try {
        if (item.type === 'task') {
          const numericId = parseInt(item.id, 10);
          if (!Number.isNaN(numericId)) {
            await supabase.from('tasks').delete().eq('id', numericId);
          }
        } else if (item.type === 'flashcard') {
          const numericId = parseInt(item.id, 10);
          if (!Number.isNaN(numericId)) {
            await supabase.from('flashcards').delete().eq('id', numericId);
          }
        } else {
          if (item.type === 'note') endpoint = `/notes/${item.id}/`;
          if (item.type === 'deck') endpoint = `/decks/decks/${item.id}/`;
          if (item.type === 'notebook') endpoint = `/notes/notebooks/${item.id}/`;
          if (item.type === 'reviewer') endpoint = `/reviewers/${item.id}/`;
          if (item.type === 'quiz') endpoint = `/reviewers/${item.id}/`; // Quiz is a reviewer with quiz tag
          await axiosInstance.delete(endpoint);
        }
      } catch (error) {
        // Continue deleting others even if one fails
        console.error('Failed to delete item during delete-all operation:', error);
      }
    }
    setToast({ message: 'All items permanently deleted.', type: 'success' });
    // Refresh trash
    fetchTrash();
  };

  const handleToggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === paginatedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(paginatedItems.map(item => item.id)));
    }
  };

  const handleRestoreSelected = async () => {
    setRestoreSelectedLoading(true);
    try {
      const itemsToRestore = filteredItems.filter(item => selectedItems.has(item.id));
      for (const item of itemsToRestore) {
        let endpoint = '';
        try {
          if (item.type === 'task') {
            const numericId = parseInt(item.id, 10);
            if (!Number.isNaN(numericId)) {
              await supabase
                .from('tasks')
                .update({ is_deleted: false, deleted_at: null })
                .eq('id', numericId);
            }
          } else if (item.type === 'flashcard') {
            const numericId = parseInt(item.id, 10);
            if (!Number.isNaN(numericId)) {
              await supabase
                .from('flashcards')
                .update({ is_deleted: false, deleted_at: null })
                .eq('id', numericId);
            }
          } else {
            if (item.type === 'note') endpoint = `/notes/${item.id}/`;
            if (item.type === 'deck') endpoint = `/decks/decks/${item.id}/`;
            if (item.type === 'notebook') endpoint = `/notes/notebooks/${item.id}/`;
            if (item.type === 'reviewer') endpoint = `/reviewers/${item.id}/`;
            if (item.type === 'quiz') endpoint = `/reviewers/${item.id}/`;
            await axiosInstance.patch(endpoint, { is_deleted: false, deleted_at: null });
          }
        } catch (error) {
          console.error('Failed to restore item during restore-selected operation:', error);
        }
      }
      setToast({ message: `${itemsToRestore.length} items restored successfully!`, type: 'success' });
      setSelectedItems(new Set());
      setShowRestoreSelectedModal(false);
      fetchTrash();
    } catch (err) {
      setToast({ message: 'Failed to restore some items.', type: 'error' });
    } finally {
      setRestoreSelectedLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    setDeleteSelectedLoading(true);
    try {
      const itemsToDelete = filteredItems.filter(item => selectedItems.has(item.id));
      for (const item of itemsToDelete) {
        let endpoint = '';
        try {
          if (item.type === 'task') {
            const numericId = parseInt(item.id, 10);
            if (!Number.isNaN(numericId)) {
              await supabase.from('tasks').delete().eq('id', numericId);
            }
          } else if (item.type === 'flashcard') {
            const numericId = parseInt(item.id, 10);
            if (!Number.isNaN(numericId)) {
              await supabase.from('flashcards').delete().eq('id', numericId);
            }
          } else {
            if (item.type === 'note') endpoint = `/notes/${item.id}/`;
            if (item.type === 'deck') endpoint = `/decks/decks/${item.id}/`;
            if (item.type === 'notebook') endpoint = `/notes/notebooks/${item.id}/`;
            if (item.type === 'reviewer') endpoint = `/reviewers/${item.id}/`;
            if (item.type === 'quiz') endpoint = `/reviewers/${item.id}/`;
            await axiosInstance.delete(endpoint);
          }
        } catch (error) {
          console.error('Failed to delete item during delete-selected operation:', error);
        }
      }
      setToast({ message: `${itemsToDelete.length} item(s) permanently deleted.`, type: 'success' });
      setSelectedItems(new Set());
      setShowDeleteSelectedModal(false);
      fetchTrash();
    } catch (err) {
      setToast({ message: 'Failed to delete some items.', type: 'error' });
    } finally {
      setDeleteSelectedLoading(false);
    }
  };

  // Filter quizzes from reviewers (reviewers with 'quiz' tag)
  const quizzes = reviewers
    .filter((reviewer: any) => reviewer.tags && Array.isArray(reviewer.tags) && reviewer.tags.includes('quiz'))
    .map((reviewer: any) => ({
      ...reviewer,
      type: 'quiz' as const,
    }));

  // Filter out quizzes from reviewers list (show only non-quiz reviewers)
  const nonQuizReviewers = reviewers.filter(
    (reviewer: any) => !reviewer.tags || !Array.isArray(reviewer.tags) || !reviewer.tags.includes('quiz')
  );

  let filteredItems: TrashItem[] = [];
  if (activeTab === 'all') {
    filteredItems = [...notes, ...decks, ...flashcards, ...notebooks, ...nonQuizReviewers, ...quizzes, ...tasks]
      .filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  } else if (activeTab === 'filter') {
    // Filter by selected types (multiple types can be selected)
    const itemsByType: TrashItem[] = [];
    
    if (selectedTypes.has('notes')) itemsByType.push(...notes);
    if (selectedTypes.has('decks')) itemsByType.push(...decks);
    if (selectedTypes.has('flashcards')) itemsByType.push(...flashcards);
    if (selectedTypes.has('notebooks')) itemsByType.push(...notebooks);
    if (selectedTypes.has('reviewer')) itemsByType.push(...nonQuizReviewers);
    if (selectedTypes.has('quiz')) itemsByType.push(...quizzes);
    if (selectedTypes.has('tasks')) itemsByType.push(...tasks);
    
    filteredItems = itemsByType
      .filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Show loading state while waiting for user data
  if (!user || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header – title + subtitle only (actions in tab row) */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Trash
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            View and restore deleted items
          </p>
        </div>

        {/* Tab row – tabs left, search + filter + actions right (compact, like Decks) */}
        <div>
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 mb-2 gap-4 flex-wrap">
            <div className="flex space-x-4">
              <button
                onClick={() => handleTabClick('all')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'all'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleTabClick('filter')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'filter'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                Filter by Type
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Pagination – before search */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
              {/* Search */}
              <div className="relative w-full sm:w-48">
                <Search size={14} className="absolute left-2 top-1.5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search trash..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-2 h-7 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Type filter dropdown – when Filter tab active */}
              {activeTab === 'filter' && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#404040] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors"
                  >
                    <span>
                      {selectedTypes.size === 0
                        ? 'Types...'
                        : selectedTypes.size === ITEM_TYPES.length
                        ? 'All types'
                        : `${selectedTypes.size} type${selectedTypes.size > 1 ? 's' : ''}`}
                    </span>
                    <ChevronDown size={10} className={`text-gray-500 dark:text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 min-w-[140px] bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow z-50 py-1">
                      {ITEM_TYPES.map((type) => {
                        const typeLabels: Record<ItemType, string> = {
                          notebooks: 'Notebooks',
                          notes: 'Notes',
                          decks: 'Decks',
                          flashcards: 'Flashcards',
                          reviewer: 'Reviewer',
                          quiz: 'Quiz',
                          tasks: 'Tasks',
                        };
                        return (
                          <label
                            key={type}
                            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] cursor-pointer transition-colors rounded-md mx-0.5"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTypes.has(type)}
                              onChange={() => handleTypeToggle(type)}
                              className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                            />
                            {typeLabels[type]}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Actions – compact buttons */}
              {selectedItems.size > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowRestoreSelectedModal(true)}
                    className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-lg border border-emerald-600 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                  >
                    <RotateCcw size={12} />
                    Restore ({selectedItems.size})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteSelectedModal(true)}
                    className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-lg border border-orange-600 text-orange-700 dark:text-orange-300 bg-white dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                  >
                    <Trash2 size={12} />
                    Delete ({selectedItems.size})
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => filteredItems.length > 0 && setShowDeleteAllModal(true)}
                disabled={filteredItems.length === 0}
                className={`inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-lg border border-red-600 text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${filteredItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Trash2 size={12} />
                Delete All
              </button>
            </div>
          </div>
          <div className="mt-4">
            <TrashList
              items={paginatedItems}
              onRestore={(id, type) => handleRestore(id, type)}
              onDelete={(id, type) => handleDelete(id, type)}
              selectedItems={selectedItems}
              onToggleSelection={handleToggleSelection}
              onSelectAll={handleSelectAll}
            />
          </div>
        </div>
        <DeleteConfirmationModal
          isOpen={showDeleteAllModal}
          onClose={() => setShowDeleteAllModal(false)}
          onConfirm={handleDeleteAll}
          title="Delete All Items?"
          message="Are you sure you want to permanently delete all items in Trash? This action cannot be undone."
          confirmLabel="Delete All"
          cancelLabel="Cancel"
        />
        {/* Restore Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showRestoreModal}
          onClose={() => { setShowRestoreModal(false); setRestoreTarget(null); }}
          onConfirm={confirmRestore}
          title="Restore Item?"
          message={`Are you sure you want to restore "${restoreTarget?.title || ''}"? It will be moved out of Trash.`}
          confirmLabel="Restore"
          cancelLabel="Cancel"
        />
        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
          onConfirm={confirmDelete}
          title="Delete Item?"
          message={`Are you sure you want to permanently delete "${deleteTarget?.title || ''}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
        />
        {/* Restore Selected Modal – same UI as Deck’s Delete Deck confirmation (icon header, Are you sure?, actions) */}
        {showRestoreSelectedModal && (
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-[100]" style={{ margin: 0, padding: 0 }}>
            <div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-xs z-[101]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header – icon + title + close (like Delete Deck) */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div className="p-1 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg mr-2">
                    <RotateCcw size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Restore Items</h2>
                </div>
                <button
                  onClick={() => { if (!restoreSelectedLoading) setShowRestoreSelectedModal(false); }}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={restoreSelectedLoading}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content – icon + “Are you sure?” + message (like Delete Deck) */}
              <div className="p-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-0.5">Are you sure?</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm m-0">
                  Restore <span className="font-medium">{selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''}</span>? They will be moved out of Trash.
                </p>
              </div>
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <button
                  type="button"
                  onClick={() => { if (!restoreSelectedLoading) setShowRestoreSelectedModal(false); }}
                  disabled={restoreSelectedLoading}
                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestoreSelected}
                  disabled={selectedItems.size === 0 || restoreSelectedLoading}
                  className={`flex-1 px-2 py-1 bg-emerald-600 text-white rounded font-medium text-sm flex items-center justify-center gap-1 transition-colors ${
                    selectedItems.size === 0 || restoreSelectedLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700'
                  }`}
                >
                  {restoreSelectedLoading ? (
                    <span className="inline-block h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RotateCcw size={14} />
                  )}
                  {restoreSelectedLoading ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Selected Modal – confirmation only; selection is on the list (like Deck’s Delete Deck style) */}
        {showDeleteSelectedModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/40 dark:bg-black/60"
              onClick={() => {
                if (!deleteSelectedLoading) setShowDeleteSelectedModal(false);
              }}
            />
            <div className="flex items-center justify-center min-h-screen p-4">
              <div
                className="relative flex flex-col bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl border border-gray-200 dark:border-[#333333] max-w-4xl w-full min-h-[36rem] max-h-[90vh] overflow-hidden z-[101]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-[#333333] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Delete Items</h3>
                  <button
                    type="button"
                    onClick={() => { if (!deleteSelectedLoading) setShowDeleteSelectedModal(false); }}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
                    disabled={deleteSelectedLoading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 py-3">
                  <p className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    The following item{selectedItems.size !== 1 ? 's' : ''} will be permanently deleted. This cannot be undone.
                  </p>
                  {selectedItems.size > 0 && (
                    <p className="flex-shrink-0 mb-2 text-xs text-red-600 dark:text-red-400">
                      {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected for deletion
                    </p>
                  )}
                  <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 dark:border-[#333333] rounded-md">
                    {filteredItems.filter((i) => selectedItems.has(i.id)).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] border-b border-gray-100 dark:border-[#333333] last:border-b-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0 px-4 py-2.5 border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#252525] rounded-b-md flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { if (!deleteSelectedLoading) setShowDeleteSelectedModal(false); }}
                    disabled={deleteSelectedLoading}
                    className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-[#333333] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={selectedItems.size === 0 || deleteSelectedLoading}
                    className="px-2.5 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteSelectedLoading
                      ? 'Deleting…'
                      : `Delete${selectedItems.size > 0 ? ` (${selectedItems.size})` : ''}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </PageLayout>
  );
};

export default Trash;
