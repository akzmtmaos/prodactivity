import React, { useState } from 'react';
import { Brain } from 'lucide-react';

interface Note {
  id: number;
  title: string;
  content: string;
  notebook_name: string;
}
interface Notebook {
  id: number;
  name: string;
}
interface ReviewerCreateModalProps {
  notes: Note[];
  notebooks: Notebook[];
  loading: boolean;
  error: string | null;
  onCreate: (data: { selectedSource: 'note' | 'notebook'; selectedNote: number | null; selectedNotebook: number | null; reviewerTitle: string }) => void;
  onCancel: () => void;
}

const ReviewerCreateModal: React.FC<ReviewerCreateModalProps> = ({ notes, notebooks, loading, error, onCreate, onCancel }) => {
  const [selectedSource, setSelectedSource] = useState<'note' | 'notebook'>('note');
  const [selectedNote, setSelectedNote] = useState<number | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<number | null>(null);
  const [reviewerTitle, setReviewerTitle] = useState('');

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/60 flex items-center justify-center z-50">
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
                  onChange={() => setSelectedSource('note')}
                  className="mr-2"
                />
                Single Note
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="notebook"
                  checked={selectedSource === 'notebook'}
                  onChange={() => setSelectedSource('notebook')}
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
              onChange={e => {
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
                ? notes.map(note => (
                    <option key={note.id} value={note.id}>
                      {note.title} ({note.notebook_name})
                    </option>
                  ))
                : notebooks.map(notebook => (
                    <option key={notebook.id} value={notebook.id}>
                      {notebook.name}
                    </option>
                  ))}
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
              onChange={e => setReviewerTitle(e.target.value)}
              placeholder="Leave empty for auto-generated title"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => onCreate({ selectedSource, selectedNote, selectedNotebook, reviewerTitle })}
              disabled={loading || (!selectedNote && !selectedNotebook)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Brain size={16} className="mr-2" />
                  Generate Reviewer
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
          {error && (
            <div className="p-2 bg-red-100 border border-red-400 text-red-700 rounded-lg mt-2">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewerCreateModal; 