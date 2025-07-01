// frontend/src/components/NotebookList.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Edit, Trash2, Book, Save, X, MoreVertical } from 'lucide-react';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';
import CreateNotebookModal from './CreateNotebookModal';

interface Notebook {
  id: number; 
  name: string;
  created_at: string;
  updated_at: string;
  notes_count: number;
}

interface NotebookListProps {
  notebooks: Notebook[];
  selectedNotebook: Notebook | null;
  editingNotebook: Notebook | null;
  newNotebookName: string;
  onNotebookSelect: (notebook: Notebook) => void;
  onAddNotebook: () => void;
  onUpdateNotebook: (id: number, name: string) => void;
  onDeleteNotebook: (notebookId: number) => void;
  onStartEditingNotebook: (notebook: Notebook) => void;
  onCancelEditingNotebook: () => void;
  onNotebookNameChange: (name: string) => void;
  onCreateNotebook: (name: string) => void;
}

const NotebookList: React.FC<NotebookListProps> = ({
  notebooks,
  selectedNotebook,
  editingNotebook,
  newNotebookName,
  onNotebookSelect,
  onAddNotebook,
  onUpdateNotebook,
  onDeleteNotebook,
  onStartEditingNotebook,
  onCancelEditingNotebook,
  onNotebookNameChange,
  onCreateNotebook,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);
  const [showCreateNotebookModal, setShowCreateNotebookModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [notebookToEdit, setNotebookToEdit] = useState<Notebook | null>(null);

  useEffect(() => {
    if (editorRef.current && editingNotebook) {
      editorRef.current.innerHTML = newNotebookName;
    }
  }, [editingNotebook, newNotebookName]);

  const handleContentChange = () => {
    if (editorRef.current) {
      onNotebookNameChange(editorRef.current.innerHTML);
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      setOpenMenuId(null);
    };
    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [openMenuId]);

  return (
    <div className="w-full lg:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow p-5 h-[calc(100vh-12rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          <Book className="inline-block mr-2" size={20} />
          Notebooks
        </h2>
        <button
          onClick={() => setShowCreateNotebookModal(true)}
          className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
          aria-label="Add Notebook"
        >
          <Plus size={20} />
        </button>
      </div>
      
      {/* Notebooks list */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        {notebooks.map((notebook) => (
          <div key={notebook.id} className="group">
            {editingNotebook?.id === notebook.id ? (
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <input
                  type="text"
                  value={newNotebookName}
                  onChange={(e) => onNotebookNameChange(e.target.value)}
                  className="w-full mb-2 p-2 border border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdateNotebook(editingNotebook.id, newNotebookName)}
                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    <Save size={16} className="text-white" />
                  </button>
                  <button
                    onClick={onCancelEditingNotebook}
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedNotebook?.id === notebook.id
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => onNotebookSelect(notebook)}
              >
                <div className="flex items-center">
                  <Book className="mr-2 text-white" size={18} />
                  <div>
                    <span className={`font-medium ${selectedNotebook?.id === notebook.id ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-gray-800 dark:text-gray-200'}`}>{notebook.name}</span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      ({notebook.notes_count})
                    </span>
                  </div>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onStartEditingNotebook(notebook);
                    }}
                    className="p-1 text-gray-500 hover:text-indigo-600 mr-1"
                  >
                    <Edit size={16} className="text-white" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setNotebookToDelete(notebook);
                    }}
                    className="p-1 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 size={16} className="text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <DeleteConfirmationModal
        isOpen={!!notebookToDelete}
        onClose={() => setNotebookToDelete(null)}
        onConfirm={() => {
          if (notebookToDelete) {
            onDeleteNotebook(notebookToDelete.id);
            setNotebookToDelete(null);
          }
        }}
        title="Delete Notebook"
        message={`Are you sure you want to delete "${notebookToDelete?.name}"? This will also delete all notes in this notebook.`}
      />

      {/* Create Notebook Modal */}
      {showCreateNotebookModal && (
        <CreateNotebookModal
          isOpen={showCreateNotebookModal}
          onClose={() => setShowCreateNotebookModal(false)}
          onCreateNotebook={(data) => {
            onCreateNotebook(data.name);
            setShowCreateNotebookModal(false);
          }}
        />
      )}
    </div>
  );
};

export default NotebookList;