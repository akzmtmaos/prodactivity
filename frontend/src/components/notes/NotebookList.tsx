// frontend/src/components/NotebookList.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Edit, Trash2, Book, Save, X, MoreVertical, FolderOpen, Archive, RotateCcw, Palette, Star, Search, Share2 } from 'lucide-react';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';
import CreateNotebookModal from './CreateNotebookModal';
import EditNotebookModal from './EditNotebookModal';
import ShareModal from '../collaboration/ShareModal';

interface Notebook {
  id: number;
  name: string;
  notebook_type: 'study' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other';
  urgency_level: 'normal' | 'important' | 'urgent' | 'critical';
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
  notes_count: number;
  is_archived: boolean;
  archived_at: string | null;
  is_favorite?: boolean;
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
  onColorChange: (notebook: Notebook) => void;
  onToggleFavorite?: (notebookId: number) => void;
  onBulkDelete?: (notebookIds: number[]) => void;
  showAddButton?: boolean;
  showBulkDeleteButton?: boolean; // Control visibility of delete button in header
  onOpenBulkDeleteModal?: React.MutableRefObject<{ open: () => void } | null> | null; // Ref to trigger bulk delete modal from parent
  // Local search controls (controlled by parent Notes.tsx)
  notebookSearchTerm?: string;
  onNotebookSearchTermChange?: (term: string) => void;
  totalCount?: number;
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
  onColorChange,
  onToggleFavorite,
  onBulkDelete,
  showAddButton = true,
  showBulkDeleteButton = true, // Show by default for backward compatibility
  onOpenBulkDeleteModal,
  notebookSearchTerm = '',
  onNotebookSearchTermChange,
  totalCount
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);
  const [showCreateNotebookModal, setShowCreateNotebookModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [notebookToEdit, setNotebookToEdit] = useState<Notebook | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedNotebooksForDelete, setSelectedNotebooksForDelete] = useState<number[]>([]);
  const [showLocalSearch, setShowLocalSearch] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [notebookToShare, setNotebookToShare] = useState<Notebook | null>(null);
  const localSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editorRef.current && editingNotebook) {
      editorRef.current.innerHTML = newNotebookName;
    }
  }, [editingNotebook, newNotebookName]);

  // Expose modal opening function to parent through ref
  useEffect(() => {
    if (onOpenBulkDeleteModal && typeof onOpenBulkDeleteModal === 'object' && onOpenBulkDeleteModal !== null) {
      // Expose open function through ref
      (onOpenBulkDeleteModal as any).current = { open: () => setShowBulkDeleteModal(true) };
    }
  }, [onOpenBulkDeleteModal]);

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
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          <Book className="inline-block mr-2" size={20} />
          Notebooks
        </h2>
      </div>
      
      {/* Notebooks list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto flex-1" style={{ alignContent: 'start' }}>
        {notebooks.length === 0 && (
          <div className="col-span-full">
            <div className="flex items-center justify-center h-40 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No notebooks found</h3>
                <p className="text-gray-500 dark:text-gray-400">Try adjusting your search terms</p>
              </div>
            </div>
          </div>
        )}
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
                    backgroundColor: notebook.color,
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
                        // Open rename modal instead of inline editing
                        setNotebookToEdit(notebook);
                        setShowEditModal(true);
                      }}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                      title="Edit notebook"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onColorChange(notebook);
                      }}
                      className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded transition-colors"
                      title="Change color"
                    >
                      <Palette size={14} />
                    </button>
                    {!notebook.is_archived && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setNotebookToShare(notebook);
                          setShowShareModal(true);
                        }}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                        title="Share notebook"
                      >
                        <Share2 size={14} />
                      </button>
                    )}
                    {onToggleFavorite && !notebook.is_archived && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onToggleFavorite(notebook.id);
                        }}
                        className={`p-1.5 rounded transition-colors ${
                          notebook.is_favorite
                            ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                            : 'text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                        }`}
                        title={notebook.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star size={14} fill={notebook.is_favorite ? 'currentColor' : 'none'} />
                      </button>
                    )}
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
                      aria-label="Delete Notebook"
                      title="Delete Notebook"
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

      {/* Edit Notebook Modal */}
      {showEditModal && notebookToEdit && (
        <EditNotebookModal
          isOpen={showEditModal}
          currentName={notebookToEdit.name}
          onClose={() => {
            setShowEditModal(false);
            setNotebookToEdit(null);
          }}
          onSave={(newName) => {
            onUpdateNotebook(notebookToEdit.id, newName);
            setShowEditModal(false);
            setNotebookToEdit(null);
          }}
        />
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/60 transition-opacity"
            onClick={() => {
              setShowBulkDeleteModal(false);
              setSelectedNotebooksForDelete([]);
            }}
          />
          {/* Modal */}
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full z-[101]">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                {/* Close button */}
                <button
                  onClick={() => {
                    setShowBulkDeleteModal(false);
                    setSelectedNotebooksForDelete([]);
                  }}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 z-10"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Delete Notebooks
                    </h3>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Select notebooks to delete. This will also delete all notes in these notebooks.
                      </p>
                      
                      {/* Notebook Selection List */}
                      <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                        {notebooks.map((notebook) => (
                          <div key={notebook.id} className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                            <input
                              type="checkbox"
                              id={`notebook-${notebook.id}`}
                              checked={selectedNotebooksForDelete.includes(notebook.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedNotebooksForDelete([...selectedNotebooksForDelete, notebook.id]);
                                } else {
                                  setSelectedNotebooksForDelete(selectedNotebooksForDelete.filter(id => id !== notebook.id));
                                }
                              }}
                              className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`notebook-${notebook.id}`} className="ml-4 flex items-center flex-1 cursor-pointer">
                              <div 
                                className="w-8 h-8 rounded-lg mr-4 shadow-sm"
                                style={{ backgroundColor: notebook.color }}
                              ></div>
                              <div className="flex-1">
                                <div className="text-base font-medium text-gray-900 dark:text-white">
                                  {notebook.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {notebook.notes_count} note{notebook.notes_count !== 1 ? 's' : ''} • Created {new Date(notebook.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              {notebook.is_favorite && (
                                <Star className="w-4 h-4 text-yellow-500 ml-2" />
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                      
                      {selectedNotebooksForDelete.length > 0 && (
                        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                          {selectedNotebooksForDelete.length} notebook{selectedNotebooksForDelete.length > 1 ? 's' : ''} selected for deletion
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    if (onBulkDelete && selectedNotebooksForDelete.length > 0) {
                      onBulkDelete(selectedNotebooksForDelete);
                      setSelectedNotebooksForDelete([]);
                      setShowBulkDeleteModal(false);
                    }
                  }}
                  disabled={selectedNotebooksForDelete.length === 0}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete {selectedNotebooksForDelete.length > 0 ? `(${selectedNotebooksForDelete.length})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkDeleteModal(false);
                    setSelectedNotebooksForDelete([]);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Share Modal */}
      {notebookToShare && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setNotebookToShare(null);
          }}
          itemType="notebook"
          itemId={notebookToShare.id}
          itemTitle={notebookToShare.name}
        />
      )}
    </div>
  );
};

export default NotebookList;