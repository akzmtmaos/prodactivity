// frontend/src/components/NotebookList.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Edit, Trash2, Book, Save, X, MoreVertical, FolderOpen, Archive, RotateCcw } from 'lucide-react';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';
import CreateNotebookModal from './CreateNotebookModal';

interface Notebook {
  id: number;
  name: string;
  notebook_type: 'study' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other';
  urgency_level: 'normal' | 'important' | 'urgent' | 'critical';
  description: string;
  created_at: string;
  updated_at: string;
  notes_count: number;
  is_archived: boolean;
  archived_at: string | null;
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
  onArchiveNotebook: (notebookId: number, archive: boolean) => void;
  showAddButton?: boolean;
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
  onArchiveNotebook,
  showAddButton = true,
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
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-5 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          <Book className="inline-block mr-2" size={20} />
          Notebooks
        </h2>
        {showAddButton && (
          <button
            onClick={() => setShowCreateNotebookModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            aria-label="Add Notebook"
          >
            <Plus size={16} />
            <span>New Notebook</span>
          </button>
        )}
      </div>
      
      {/* Notebooks list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 overflow-y-auto">
        {notebooks.map((notebook) => (
          <div key={notebook.id} className="group">
            {editingNotebook?.id === notebook.id ? (
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg min-h-[140px] w-full">
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
                className={`rounded-lg transition-all border flex flex-col cursor-pointer h-[160px] w-full overflow-hidden ${
                  selectedNotebook?.id === notebook.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-200 dark:border-indigo-700 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => onNotebookSelect(notebook)}
              >
                {/* Colored header area */}
                <div 
                  className={`h-16 flex items-center justify-center`}
                  style={{
                    backgroundColor: `hsl(${(notebook.id * 137.5) % 360}, 70%, 85%)`,
                  }}
                >
                  <Book className={`${
                    selectedNotebook?.id === notebook.id
                      ? 'text-indigo-600 dark:text-indigo-300'
                      : 'text-gray-600 dark:text-gray-400'
                  }`} size={24} />
                </div>
                
                {/* Notebook name */}
                <div className={`font-semibold text-lg mb-auto p-4 pb-2 truncate ${
                  selectedNotebook?.id === notebook.id 
                    ? 'text-indigo-700 dark:text-indigo-300' 
                    : 'text-gray-800 dark:text-gray-200'
                }`}>
                  {notebook.name}
                </div>
                
                {/* Bottom section with notes count and action buttons */}
                <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {notebook.notes_count} {notebook.notes_count === 1 ? 'note' : 'notes'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onStartEditingNotebook(notebook);
                      }}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                      title="Edit notebook"
                    >
                      <Edit size={14} />
                    </button>
                    {notebook.is_archived ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onArchiveNotebook(notebook.id, false);
                        }}
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                        title="Unarchive notebook"
                      >
                        <RotateCcw size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onArchiveNotebook(notebook.id, true);
                        }}
                        className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded transition-colors"
                        title="Archive notebook"
                      >
                        <Archive size={14} />
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setNotebookToDelete(notebook);
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                      title="Delete notebook"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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