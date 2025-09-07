import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReviewerPanel from '../components/reviewer/ReviewerPanel';
import PageLayout from '../components/PageLayout';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ReviewerDocument from '../components/reviewer/ReviewerDocument';

const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.56.1:8000/api/reviewer';

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

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching data from:', `${API_URL}/notes/notebooks/` + ' and ' + `${API_URL}/notes/`);
        // Test authentication first
        console.log('Auth headers:', getAuthHeaders());
        
        const [notebooksRes, notesRes] = await Promise.all([
          axios.get(`${API_URL}/notes/notebooks/`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/notes/`, { 
            headers: getAuthHeaders(),
            params: { archived: 'false' } // Explicitly request non-archived notes
          }),
        ]);
        console.log('Notebooks response:', notebooksRes.data);
        console.log('Notes response:', notesRes.data);
        console.log('Notes count:', notesRes.data?.length || 0);
        
        // Check if notes have the expected structure
        if (notesRes.data && Array.isArray(notesRes.data) && notesRes.data.length > 0) {
          console.log('First note structure:', notesRes.data[0]);
        }
        
        setNotebooks(notebooksRes.data);
        setNotes(notesRes.data);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch reviewer by id if reviewerId param exists (but not for special tabs)
  useEffect(() => {
    const fetchReviewer = async () => {
      if (reviewerId && reviewerId !== 'q' && reviewerId !== 'r') {
        try {
          const token = localStorage.getItem('accessToken');
          const response = await axios.get(`${API_URL}/reviewers/${reviewerId}/`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          setModalReviewer(response.data);
        } catch (err) {
          setModalReviewer(null);
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