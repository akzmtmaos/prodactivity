import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import TrashList from '../components/trash/TrashList';
import Toast from '../components/common/Toast';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';
import { Trash2 } from 'lucide-react';
import Pagination from '../components/common/Pagination';

// Define TrashItem type here for use in state
export type TrashItem = {
  id: string;
  type: 'note' | 'deck' | 'reviewer';
  title: string;
  deletedAt: string;
};

const TABS = ['all', 'notes', 'decks', 'reviewer'] as const;
type TabType = typeof TABS[number];

const ITEMS_PER_PAGE = 10;

const Trash = () => {
  const { tab } = useParams<{ tab?: TabType }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [greeting, setGreeting] = useState('');
  const [notes, setNotes] = useState<TrashItem[]>([]);
  const [decks, setDecks] = useState<TrashItem[]>([]);
  const [reviewers, setReviewers] = useState<TrashItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(tab && TABS.includes(tab) ? tab : 'all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; type: 'note' | 'deck' | 'reviewer'; title: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'note' | 'deck' | 'reviewer'; title: string } | null>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  // Sync activeTab with URL param
  useEffect(() => {
    if (tab && TABS.includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('all');
    }
  }, [tab]);

  // Helper to map tab to TrashItem type
  const tabToType = (tab: TabType): 'note' | 'deck' | 'reviewer' => {
    if (tab === 'notes') return 'note';
    if (tab === 'decks') return 'deck';
    if (tab === 'reviewer') return 'reviewer';
    // For 'all', fallback to 'note' (should not be used directly)
    return 'note';
  };

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

    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Fetch deleted notes
      const notesRes = await fetch(`${API_URL}/trash/notes/`, { headers });
      const notesData = await notesRes.json();
      setNotes(
        notesData.map((note: any) => ({
          id: note.id,
          type: 'note',
          title: note.title,
          deletedAt: note.deleted_at || note.updated_at || '',
        }))
      );

      // Fetch deleted decks
      const decksRes = await fetch(`${API_URL}/trash/decks/`, { headers });
      const decksData = await decksRes.json();
      setDecks(
        decksData.map((deck: any) => ({
          id: deck.id,
          type: 'deck',
          title: deck.title,
          deletedAt: deck.deleted_at || deck.updated_at || '',
        }))
      );

      // Fetch deleted reviewers
      const reviewersRes = await fetch(`${API_URL}/trash/reviewers/`, { headers });
      const reviewersData = await reviewersRes.json();
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
  }, [activeTab, notes, decks, reviewers]);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    navigate(`/trash/${tab}`);
  };

  const handleRestore = async (id: string, type: 'note' | 'deck' | 'reviewer') => {
    setRestoreTarget({ id, type, title: (filteredItems.find(i => i.id === id)?.title) || '' });
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    const { id, type } = restoreTarget;
    const token = localStorage.getItem('accessToken');
    let url = '';
    if (type === 'note') url = `${API_URL}/notes/${id}/`;
    if (type === 'deck') url = `${API_URL}/decks/decks/${id}/`;
    if (type === 'reviewer') url = `${API_URL}/reviewers/${id}/`;
    try {
      await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ is_deleted: false, deleted_at: null })
      });
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

  const handleDelete = async (id: string, type: 'note' | 'deck' | 'reviewer') => {
    setDeleteTarget({ id, type, title: (filteredItems.find(i => i.id === id)?.title) || '' });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, type } = deleteTarget;
    const token = localStorage.getItem('accessToken');
    let url = '';
    if (type === 'note') url = `${API_URL}/notes/${id}/`;
    if (type === 'deck') url = `${API_URL}/decks/decks/${id}/`;
    if (type === 'reviewer') url = `${API_URL}/reviewers/${id}/`;
    try {
      await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
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
    const token = localStorage.getItem('accessToken');
    for (const item of filteredItems) {
      let url = '';
      if (item.type === 'note') url = `${API_URL}/notes/${item.id}/`;
      if (item.type === 'deck') url = `${API_URL}/decks/decks/${item.id}/`;
      if (item.type === 'reviewer') url = `${API_URL}/reviewers/${item.id}/`;
      try {
        await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
      } catch (error) {
        // Continue deleting others even if one fails
      }
    }
    setToast({ message: 'All items permanently deleted.', type: 'success' });
    // Refresh trash
    fetchTrash();
  };

  let filteredItems: TrashItem[] = [];
  if (activeTab === 'all') {
    filteredItems = [...notes, ...decks, ...reviewers].sort(
      (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
  } else if (activeTab === 'notes') {
    filteredItems = notes;
  } else if (activeTab === 'decks') {
    filteredItems = decks;
  } else if (activeTab === 'reviewer') {
    filteredItems = reviewers;
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Trash
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View and restore deleted items
            </p>
          </div>
          <button
            className={`bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center ${filteredItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => filteredItems.length > 0 && setShowDeleteAllModal(true)}
            disabled={filteredItems.length === 0}
          >
            <Trash2 className="mr-2" size={18} />
            Delete All
          </button>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex space-x-2 mt-4">
            <button
              onClick={() => handleTabClick('all')}
              className={`px-4 py-2 font-medium focus:outline-none transition-colors rounded-t-md ${activeTab === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              All
            </button>
            <button
              onClick={() => handleTabClick('notes')}
              className={`px-4 py-2 font-medium focus:outline-none transition-colors rounded-t-md ${activeTab === 'notes' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              Notes
            </button>
            <button
              onClick={() => handleTabClick('decks')}
              className={`px-4 py-2 font-medium focus:outline-none transition-colors rounded-t-md ${activeTab === 'decks' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              Decks
            </button>
            <button
              onClick={() => handleTabClick('reviewer')}
              className={`px-4 py-2 font-medium focus:outline-none transition-colors rounded-t-md ${activeTab === 'reviewer' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              Reviewer
            </button>
          </div>
          <hr className="border-t border-gray-300 dark:border-gray-700 mb-6" />
          <div className="mt-4">
            <TrashList
              items={paginatedItems}
              onRestore={(id, type) => handleRestore(id, type)}
              onDelete={(id, type) => handleDelete(id, type)}
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
