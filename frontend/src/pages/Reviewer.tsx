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
        const doFetch = async () => Promise.all([
          axiosInstance.get(`/notes/notebooks/`, { timeout: 12000 }),
          axiosInstance.get(`/notes/`, { timeout: 12000, params: { archived: 'false' } })
        ]);

        let notebooksRes, notesRes;
        try {
          [notebooksRes, notesRes] = await doFetch();
        } catch (_first) {
          // Retry once after a short delay (handles cold starts)
          await new Promise(r => setTimeout(r, 800));
          [notebooksRes, notesRes] = await doFetch();
        }

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
      <div className="flex h-full flex-col min-h-0">
        <div className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full">
          {/* Document-style view when a reviewer is open; otherwise list panel */}
          {reviewerId && reviewerId !== 'q' && reviewerId !== 'r' && modalReviewer ? (
            <ReviewerDocument reviewer={modalReviewer} onClose={() => navigate('/reviewer/r')} />
          ) : (
            <ReviewerPanel notes={notes} notebooks={notebooks} activeTab={activeTab} setActiveTab={setActiveTab} />
          )}
        </div>
      </div>
      {reviewerId && reviewerId !== 'q' && reviewerId !== 'r' && !modalReviewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Reviewer not found</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Could not load the reviewer. It may not exist or you may not have access.</p>
            <button
              onClick={() => navigate('/reviewer/r')}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Back to list
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Reviewer; 