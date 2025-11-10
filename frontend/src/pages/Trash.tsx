import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import HelpButton from '../components/HelpButton';
import TrashList from '../components/trash/TrashList';
import Toast from '../components/common/Toast';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';
import { Trash2 } from 'lucide-react';
import { useRef } from 'react';
import Pagination from '../components/common/Pagination';
import axiosInstance from '../utils/axiosConfig';
import { API_BASE_URL } from '../config/api';

// Define TrashItem type here for use in state
export type TrashItem = {
  id: string;
  type: 'note' | 'deck' | 'notebook' | 'reviewer';
  title: string;
  deletedAt: string;
};

const TABS = ['all', 'notes', 'decks', 'notebooks', 'reviewer'] as const;
type TabType = typeof TABS[number];

const ITEMS_PER_PAGE = 10;

const Trash = () => {
  const { tab } = useParams<{ tab?: TabType }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [notes, setNotes] = useState<TrashItem[]>([]);
  const [decks, setDecks] = useState<TrashItem[]>([]);
  const [notebooks, setNotebooks] = useState<TrashItem[]>([]);
  const [reviewers, setReviewers] = useState<TrashItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(tab && TABS.includes(tab) ? tab : 'all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; type: 'note' | 'deck' | 'notebook' | 'reviewer'; title: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'note' | 'deck' | 'notebook' | 'reviewer'; title: string } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [showRestoreSelectedModal, setShowRestoreSelectedModal] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync activeTab with URL param
  useEffect(() => {
    if (tab && TABS.includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('all');
    }
  }, [tab]);

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
        }))
      );
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
  }, [activeTab, notes, decks, notebooks, reviewers]);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    navigate(`/trash/${tab}`);
  };

  const handleRestore = async (id: string, type: 'note' | 'deck' | 'notebook' | 'reviewer') => {
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
    try {
      await axiosInstance.patch(endpoint, { is_deleted: false, deleted_at: null });
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

  const handleDelete = async (id: string, type: 'note' | 'deck' | 'notebook' | 'reviewer') => {
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
    try {
      await axiosInstance.delete(endpoint);
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
      if (item.type === 'note') endpoint = `/notes/${item.id}/`;
      if (item.type === 'deck') endpoint = `/decks/decks/${item.id}/`;
      if (item.type === 'notebook') endpoint = `/notes/notebooks/${item.id}/`;
      if (item.type === 'reviewer') endpoint = `/reviewers/${item.id}/`;
      try {
        await axiosInstance.delete(endpoint);
      } catch (error) {
        // Continue deleting others even if one fails
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
    setShowRestoreSelectedModal(false);
    const itemsToRestore = filteredItems.filter(item => selectedItems.has(item.id));
    
    for (const item of itemsToRestore) {
      let endpoint = '';
      if (item.type === 'note') endpoint = `/notes/${item.id}/`;
      if (item.type === 'deck') endpoint = `/decks/decks/${item.id}/`;
      if (item.type === 'notebook') endpoint = `/notes/notebooks/${item.id}/`;
      if (item.type === 'reviewer') endpoint = `/reviewers/${item.id}/`;
      try {
        await axiosInstance.patch(endpoint, { is_deleted: false, deleted_at: null });
      } catch (error) {
        // Continue restoring others even if one fails
      }
    }
    setToast({ message: `${selectedItems.size} items restored successfully!`, type: 'success' });
    setSelectedItems(new Set());
    fetchTrash();
  };

  const handleDeleteSelected = async () => {
    setShowDeleteSelectedModal(false);
    const itemsToDelete = filteredItems.filter(item => selectedItems.has(item.id));
    
    for (const item of itemsToDelete) {
      let endpoint = '';
      if (item.type === 'note') endpoint = `/notes/${item.id}/`;
      if (item.type === 'deck') endpoint = `/decks/decks/${item.id}/`;
      if (item.type === 'notebook') endpoint = `/notes/notebooks/${item.id}/`;
      if (item.type === 'reviewer') endpoint = `/reviewers/${item.id}/`;
      try {
        await axiosInstance.delete(endpoint);
      } catch (error) {
        // Continue deleting others even if one fails
      }
    }
    setToast({ message: `${selectedItems.size} item(s) permanently deleted.`, type: 'success' });
    setSelectedItems(new Set());
    fetchTrash();
  };

  let filteredItems: TrashItem[] = [];
  if (activeTab === 'all') {
    filteredItems = [...notes, ...decks, ...notebooks, ...reviewers]
      .filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  } else if (activeTab === 'notes') {
    filteredItems = notes.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
  } else if (activeTab === 'decks') {
    filteredItems = decks.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
  } else if (activeTab === 'notebooks') {
    filteredItems = notebooks.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
  } else if (activeTab === 'reviewer') {
    filteredItems = reviewers.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
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
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              Trash
              <HelpButton 
                content={
                  <div>
                    <p className="font-semibold mb-2">Trash Management</p>
                    <ul className="space-y-1 text-xs">
                      <li>• <strong>Deleted Items:</strong> View all deleted tasks, notes, decks, and notebooks</li>
                      <li>• <strong>Restore:</strong> Bring back accidentally deleted items</li>
                      <li>• <strong>Permanent Delete:</strong> Completely remove items from system</li>
                      <li>• <strong>Search:</strong> Find specific deleted items quickly</li>
                      <li>• <strong>Filter by Type:</strong> View tasks, notes, decks, or notebooks separately</li>
                      <li>• <strong>Auto-cleanup:</strong> Items are automatically purged after 30 days</li>
                      <li>• <strong>Bulk Actions:</strong> Restore or delete multiple items at once</li>
                    </ul>
                  </div>
                } 
                title="Trash Help" 
              />
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View and restore deleted items
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center w-full md:w-auto">
            <div className="w-full sm:w-64">
              <div className="relative rounded-md shadow-sm">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="block w-full rounded-md border border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white pl-10 pr-3 py-2 text-sm"
                  placeholder="Search trash..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            {selectedItems.size > 0 && (
              <>
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                  onClick={() => setShowRestoreSelectedModal(true)}
                >
                  <svg className="mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  Restore Selected ({selectedItems.size})
                </button>
                <button
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                  onClick={() => setShowDeleteSelectedModal(true)}
                >
                  <Trash2 className="mr-2" size={18} />
                  Delete Selected ({selectedItems.size})
                </button>
              </>
            )}
            <button
              className={`bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center ${filteredItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => filteredItems.length > 0 && setShowDeleteAllModal(true)}
              disabled={filteredItems.length === 0}
            >
              <Trash2 className="mr-2" size={18} />
              Delete All
            </button>
          </div>
        </div>

        {/* Tabs styled like Settings */}
        <div>
          <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-8">
            <button
              onClick={() => handleTabClick('all')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'all'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleTabClick('notebooks')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'notebooks'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Notebooks
            </button>
            <button
              onClick={() => handleTabClick('notes')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'notes'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => handleTabClick('decks')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'decks'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Decks
            </button>
            <button
              onClick={() => handleTabClick('reviewer')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'reviewer'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Reviewer
            </button>
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
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
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
        {/* Restore Selected Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showRestoreSelectedModal}
          onClose={() => setShowRestoreSelectedModal(false)}
          onConfirm={handleRestoreSelected}
          title="Restore Selected Items?"
          message={`Are you sure you want to restore ${selectedItems.size} selected item(s)? They will be moved out of Trash.`}
          confirmLabel="Restore Selected"
          cancelLabel="Cancel"
        />
        {/* Delete Selected Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteSelectedModal}
          onClose={() => setShowDeleteSelectedModal(false)}
          onConfirm={handleDeleteSelected}
          title="Delete Selected Items?"
          message={`Are you sure you want to permanently delete ${selectedItems.size} selected item(s)? This action cannot be undone.`}
          confirmLabel="Delete Selected"
          cancelLabel="Cancel"
        />
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
