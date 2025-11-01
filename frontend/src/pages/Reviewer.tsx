import React, { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosConfig';
import ReviewerPanel from '../components/reviewer/ReviewerPanel';
import PageLayout from '../components/PageLayout';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ReviewerDocument from '../components/reviewer/ReviewerDocument';

const NOTEBOOKS_CACHE_KEY = 'reviewerCachedNotebooksV1';
const NOTES_CACHE_KEY = 'reviewerCachedNotesV1';
const REVIEWER_CACHE_PREFIX = 'reviewerItem_';

const Reviewer = () => {
  const { id: reviewerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalReviewer, setModalReviewer] = useState<any | null>(null);
  // Track active tab based on URL
  const [activeTab, setActiveTab] = useState<'reviewer' | 'quiz'>(location.pathname.includes('/q') ? 'quiz' : 'reviewer');

  // Update URL when tab changes
  useEffect(() => {
    if (!reviewerId) {
      if (activeTab === 'reviewer' && !location.pathname.endsWith('/r')) {
        navigate('/reviewer/r', { replace: true });
      } else if (activeTab === 'quiz' && !location.pathname.endsWith('/q')) {
        navigate('/reviewer/q', { replace: true });
      }
    }
  }, [activeTab, reviewerId, location.pathname, navigate]);

  // Authorization headers are handled by axiosInstance interceptor

  useEffect(() => {
    const fetchData = async () => {
      // 1) Hydrate from cache instantly for fast first paint
      try {
        const cachedNotebooks = localStorage.getItem(NOTEBOOKS_CACHE_KEY);
        if (cachedNotebooks) {
          const parsed = JSON.parse(cachedNotebooks);
          if (parsed && Array.isArray(parsed.data)) setNotebooks(parsed.data);
        }
        const cachedNotes = localStorage.getItem(NOTES_CACHE_KEY);
        if (cachedNotes) {
          const parsed = JSON.parse(cachedNotes);
          if (parsed && Array.isArray(parsed.data)) setNotes(parsed.data);
        }
      } catch {}

      // 2) Kick off fresh fetch in background with short timeouts
      setLoading(false);
      try {
        const [notebooksRes, notesRes] = await Promise.all([
          axiosInstance.get(`/notes/notebooks/`, { timeout: 4000 }),
          axiosInstance.get(`/notes/`, { timeout: 4000, params: { archived: 'false' } })
        ]);

        const notebooksData = notebooksRes.data?.results || notebooksRes.data || [];
        const notesData = notesRes.data?.results || notesRes.data || [];

        setNotebooks(notebooksData);
        setNotes(notesData);

        try {
          localStorage.setItem(NOTEBOOKS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: notebooksData }));
          localStorage.setItem(NOTES_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: notesData }));
        } catch {}
      } catch (err) {
        console.error('Failed to fetch reviewer data:', err);
        // Only show error if we have nothing to show
        if (notebooks.length === 0 && notes.length === 0) {
        setError('Failed to load data');
        }
      }
    };
    fetchData();
  }, []);

  // Fetch reviewer by id if reviewerId param exists (but not for special tabs)
  useEffect(() => {
    const fetchReviewer = async () => {
      if (reviewerId && reviewerId !== 'q' && reviewerId !== 'r') {
        // 1) Instant hydrate from cache for this reviewer
        try {
          const cached = localStorage.getItem(`${REVIEWER_CACHE_PREFIX}${reviewerId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.data) setModalReviewer(parsed.data);
          }
        } catch {}

        // 2) Fetch fresh data with short timeout and quiet failures
        try {
          const response = await axiosInstance.get(`/reviewers/${reviewerId}/`, { timeout: 3000 });
          setModalReviewer(response.data);
          try {
            localStorage.setItem(`${REVIEWER_CACHE_PREFIX}${reviewerId}`, JSON.stringify({ ts: Date.now(), data: response.data }));
          } catch {}
        } catch (err) {
          // Keep whatever we have (cached or null); don't block UI
        }
      } else {
        setModalReviewer(null);
      }
    };
    fetchReviewer();
  }, [reviewerId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="p-8 text-center text-red-600 dark:text-red-400">{error}</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="flex h-full">
        <div className="flex-1 space-y-6">
          <div className="max-w-7xl mx-auto">
            <ReviewerPanel notes={notes} notebooks={notebooks} activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        </div>
      </div>
      {reviewerId && reviewerId !== 'q' && reviewerId !== 'r' && !modalReviewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-2xl p-6 relative flex flex-col max-h-[80vh]">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold focus:outline-none"
              onClick={() => navigate('/reviewer/r')}
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Reviewer Not Found</h2>
            <div className="p-4 text-gray-700 dark:text-gray-300">Could not load the reviewer. It may not exist or you may not have access.</div>
          </div>
        </div>
      )}
      {reviewerId && reviewerId !== 'q' && reviewerId !== 'r' && modalReviewer && (
        <ReviewerDocument reviewer={modalReviewer} onClose={() => navigate('/reviewer/r')} />
      )}
    </PageLayout>
  );
};

export default Reviewer; 