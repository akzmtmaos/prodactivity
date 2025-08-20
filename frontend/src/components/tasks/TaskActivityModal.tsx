import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface TaskActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskTitle: string;
  onActivityLogged: () => void;
}

interface EvidenceStatus {
  has_activity: boolean;
  time_spent_minutes: number;
  has_activity_notes: boolean;
  evidence_uploaded: boolean;
  has_evidence_file: boolean;
  has_evidence_description: boolean;
  can_be_completed: boolean;
  missing_requirements: string[];
}

const TaskActivityModal: React.FC<TaskActivityModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  onActivityLogged
}) => {
  const [activeTab, setActiveTab] = useState<'activity' | 'evidence' | 'status'>('activity');
  const [timeSpent, setTimeSpent] = useState(5);
  const [notes, setNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [evidenceStatus, setEvidenceStatus] = useState<EvidenceStatus | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchEvidenceStatus = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/tasks/${taskId}/evidence_status/`,
        { headers: getAuthHeaders() }
      );
      setEvidenceStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch evidence status:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEvidenceStatus();
    }
  }, [isOpen, taskId]);

  const handleQuickLog = async () => {
    setLoading(true);
    setError('');
    
    try {
      await axios.post(
        `http://localhost:8000/api/tasks/${taskId}/log_activity/`,
        {},
        { headers: getAuthHeaders() }
      );
      await fetchEvidenceStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeLog = async () => {
    setLoading(true);
    setError('');
    
    try {
      await axios.post(
        `http://localhost:8000/api/tasks/${taskId}/add_time/`,
        { minutes: timeSpent },
        { headers: getAuthHeaders() }
      );
      await fetchEvidenceStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to log time');
    } finally {
      setLoading(false);
    }
  };

  const handleNotesLog = async () => {
    if (!notes.trim()) {
      setError('Please enter some notes about what you worked on');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await axios.post(
        `http://localhost:8000/api/tasks/${taskId}/add_notes/`,
        { notes: notes.trim() },
        { headers: getAuthHeaders() }
      );
      await fetchEvidenceStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add notes');
    } finally {
      setLoading(false);
    }
  };

  const handleEvidenceUpload = async () => {
    if (!evidenceFile && !evidenceDescription.trim()) {
      setError('Please provide either a file or description as evidence');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      if (evidenceFile) {
        formData.append('evidence_file', evidenceFile);
      }
      if (evidenceDescription.trim()) {
        formData.append('evidence_description', evidenceDescription.trim());
      }
      
      await axios.post(
        `http://localhost:8000/api/tasks/${taskId}/upload_evidence/`,
        formData,
        { 
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      await fetchEvidenceStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload evidence');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setEvidenceFile(file);
      setError('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Task Completion Requirements
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          To mark "<span className="font-medium">{taskTitle}</span>" as complete, you need to:
        </p>

        {/* Tabs */}
        <div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'activity'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
          <button
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'evidence'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => setActiveTab('evidence')}
          >
            Evidence
          </button>
          <button
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'status'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => setActiveTab('status')}
          >
            Status
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Tab content */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Log Your Work Activity</h3>
              
              {/* Quick Log */}
              <div className="mb-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quick Activity Log</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Quickly mark that you've worked on this task.
                </p>
                <button
                  onClick={handleQuickLog}
                  disabled={loading}
                  className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Logging...' : 'Mark as Worked On'}
                </button>
              </div>

              {/* Time Log */}
              <div className="mb-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Log Time Spent</h4>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={timeSpent}
                    onChange={(e) => setTimeSpent(parseInt(e.target.value) || 5)}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                  <span className="text-gray-600 dark:text-gray-400">minutes</span>
                </div>
                <button
                  onClick={handleTimeLog}
                  disabled={loading}
                  className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Logging...' : `Log ${timeSpent} Minutes`}
                </button>
              </div>

              {/* Notes Log */}
              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Add Activity Notes</h4>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe what you accomplished or worked on..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none mb-3"
                />
                <button
                  onClick={handleNotesLog}
                  disabled={loading || !notes.trim()}
                  className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Notes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Provide Evidence of Your Work</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Upload a screenshot, document, or provide a detailed description of what you accomplished.
              </p>

              {/* File Upload */}
              <div className="mb-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Upload Evidence File</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Screenshots, documents, or any file that proves your work (max 10MB)
                </p>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {evidenceFile && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    Selected: {evidenceFile.name}
                  </p>
                )}
              </div>

              {/* Evidence Description */}
              <div className="mb-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Evidence Description</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Provide a detailed description of what you accomplished (at least 20 characters)
                </p>
                <textarea
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  placeholder="Describe the evidence of your work, what you accomplished, or provide links to your work..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none mb-3"
                />
                <button
                  onClick={handleEvidenceUpload}
                  disabled={loading || (!evidenceFile && !evidenceDescription.trim())}
                  className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Uploading...' : 'Upload Evidence'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'status' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Completion Status</h3>
            
            {evidenceStatus ? (
              <div className="space-y-4">
                {/* Activity Status */}
                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Activity Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Work Activity:</span>
                      <span className={`text-sm font-medium ${evidenceStatus.has_activity ? 'text-green-600' : 'text-red-600'}`}>
                        {evidenceStatus.has_activity ? '✓ Completed' : '✗ Missing'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Time Spent:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {evidenceStatus.time_spent_minutes} minutes
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Activity Notes:</span>
                      <span className={`text-sm font-medium ${evidenceStatus.has_activity_notes ? 'text-green-600' : 'text-red-600'}`}>
                        {evidenceStatus.has_activity_notes ? '✓ Provided' : '✗ Missing'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Evidence Status */}
                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Evidence Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Evidence Uploaded:</span>
                      <span className={`text-sm font-medium ${evidenceStatus.evidence_uploaded ? 'text-green-600' : 'text-red-600'}`}>
                        {evidenceStatus.evidence_uploaded ? '✓ Uploaded' : '✗ Missing'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Evidence File:</span>
                      <span className={`text-sm font-medium ${evidenceStatus.has_evidence_file ? 'text-green-600' : 'text-red-600'}`}>
                        {evidenceStatus.has_evidence_file ? '✓ Provided' : '✗ Missing'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Evidence Description:</span>
                      <span className={`text-sm font-medium ${evidenceStatus.has_evidence_description ? 'text-green-600' : 'text-red-600'}`}>
                        {evidenceStatus.has_evidence_description ? '✓ Provided' : '✗ Missing'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overall Status */}
                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Overall Status</h4>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Can Complete Task:</span>
                    <span className={`text-sm font-medium ${evidenceStatus.can_be_completed ? 'text-green-600' : 'text-red-600'}`}>
                      {evidenceStatus.can_be_completed ? '✓ Ready' : '✗ Not Ready'}
                    </span>
                  </div>
                  
                  {evidenceStatus.missing_requirements.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Missing Requirements:</p>
                      <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
                        {evidenceStatus.missing_requirements.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading status...</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskActivityModal;
