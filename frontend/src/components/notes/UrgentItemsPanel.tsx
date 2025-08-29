// frontend/src/components/notes/UrgentItemsPanel.tsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, BookOpen, FileText, Clock } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';

interface UrgentNote {
  id: number;
  title: string;
  content: string;
  notebook: number;
  notebook_name: string;
  notebook_type: string;
  notebook_urgency: string;
  note_type: 'lecture' | 'reading' | 'assignment' | 'exam' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_urgent: boolean;
  tags: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  is_archived: boolean;
  archived_at: string | null;
}

interface UrgentNotebook {
  id: number;
  name: string;
  notebook_type: 'study' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other';
  urgency_level: 'normal' | 'important' | 'urgent' | 'critical';
  description: string;
  notes_count: number;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  archived_at: string | null;
}

interface UrgentItemsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteClick: (note: UrgentNote) => void;
  onNotebookClick: (notebook: UrgentNotebook) => void;
}

const UrgentItemsPanel: React.FC<UrgentItemsPanelProps> = ({
  isOpen,
  onClose,
  onNoteClick,
  onNotebookClick,
}) => {
  const [urgentNotes, setUrgentNotes] = useState<UrgentNote[]>([]);
  const [urgentNotebooks, setUrgentNotebooks] = useState<UrgentNotebook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUrgentItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/notes/urgent/');
      setUrgentNotes(response.data.urgent_notes || []);
      setUrgentNotebooks(response.data.urgent_notebooks || []);
    } catch (err: any) {
      setError('Failed to fetch urgent items');
      console.error('Error fetching urgent items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUrgentItems();
    }
  }, [isOpen]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'urgent':
        return 'bg-orange-500 text-white';
      case 'important':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Urgent Items Requiring Attention
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : (
            <div className="space-y-6">
              {/* Urgent Notebooks */}
              {urgentNotebooks.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-orange-500" />
                    Urgent Notebooks ({urgentNotebooks.length})
                  </h3>
                  <div className="grid gap-3">
                    {urgentNotebooks.map((notebook) => (
                      <div
                        key={notebook.id}
                        onClick={() => onNotebookClick(notebook)}
                        className="p-4 border border-orange-200 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-900/20 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {notebook.name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {notebook.description || 'No description'}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(notebook.urgency_level)}`}>
                                {notebook.urgency_level.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {notebook.notes_count} notes
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Updated {formatDate(notebook.updated_at)}
                              </span>
                            </div>
                          </div>
                          <Clock className="h-5 w-5 text-orange-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Urgent Notes */}
              {urgentNotes.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-red-500" />
                    Urgent Notes ({urgentNotes.length})
                  </h3>
                  <div className="grid gap-3">
                    {urgentNotes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => onNoteClick(note)}
                        className="p-4 border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {note.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {note.content.substring(0, 150)}...
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(note.priority)}`}>
                                {note.priority.toUpperCase()}
                              </span>
                              {note.is_urgent && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-600 text-white">
                                  URGENT
                                </span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {note.notebook_name}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Updated {formatDate(note.updated_at)}
                              </span>
                            </div>
                          </div>
                          <Clock className="h-5 w-5 text-red-500 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No urgent items */}
              {urgentNotes.length === 0 && urgentNotebooks.length === 0 && (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Urgent Items
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    All your notes and notebooks are up to date!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total urgent items: {urgentNotes.length + urgentNotebooks.length}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UrgentItemsPanel;
