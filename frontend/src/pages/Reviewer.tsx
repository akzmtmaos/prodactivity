import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReviewerPanel from '../components/reviewer/ReviewerPanel';
import PageLayout from '../components/PageLayout';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const Reviewer = () => {
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const [notebooksRes, notesRes] = await Promise.all([
          axios.get(`${API_URL}/notes/notebooks/`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/notes/`, { headers: getAuthHeaders() }),
        ]);
        setNotebooks(notebooksRes.data);
        setNotes(notesRes.data);
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
            <ReviewerPanel notes={notes} notebooks={notebooks} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Reviewer; 