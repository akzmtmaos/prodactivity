// frontend/src/components/NotebookList.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Edit, Trash2, Book, Save, X, MoreVertical, FolderOpen, Archive, RotateCcw, Palette, Star, Search, Share2, Settings } from 'lucide-react';
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
  /** Discord-style list density: comfortable (default) or compact */
  listViewMode?: 'compact' | 'comfortable';
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
  totalCount,
  listViewMode = 'comfortable'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);
  const [showCreateNotebookModal, setShowCreateNotebookModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [openOptionsNotebookId, setOpenOptionsNotebookId] = useState<number | null>(null);
  const compactOptionsMenuRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [notebookToEdit, setNotebookToEdit] = useState<Notebook | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedNotebooksForDelete, setSelectedNotebooksForDelete] = useState<number[]>([]);
  const [showLocalSearch, setShowLocalSearch] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [notebookToShare, setNotebookToShare] = useState<Notebook | null>(null);
  const [deleteButtonTooltip, setDeleteButtonTooltip] = useState(false);
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (compactOptionsMenuRef.current && !compactOptionsMenuRef.current.contains(e.target as Node)) {
        setOpenOptionsNotebookId(null);
      }
    };
    if (openOptionsNotebookId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openOptionsNotebookId]);

  const isCompact = listViewMode === 'compact';

  /** One notebook per full-width row (compact list) */
  const renderCompactRow = (notebook: Notebook) => {
    if (editingNotebook?.id === notebook.id) {
      return (
        <div key={notebook.id} className="flex items-center gap-3 h-12 min-h-12 px-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: notebook.color }} />
          <input
            type="text"
            value={newNotebookName}
            onChange={(e) => onNotebookNameChange(e.target.value)}
            className="flex-1 min-w-0 h-7 px-2 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={() => onUpdateNotebook(editingNotebook.id, newNotebookName)} className="p-1.5 h-7 flex items-center justify-center bg-indigo-600 text-white rounded hover:bg-indigo-700"><Save size={14} /></button>
          <button onClick={onCancelEditingNotebook} className="p-1.5 h-7 flex items-center justify-center bg-gray-500 text-white rounded hover:bg-gray-600"><X size={14} /></button>
        </div>
      );
    }
    const selected = selectedNotebook?.id === notebook.id;
    return (
      <div
        key={notebook.id}
        className={`flex items-center gap-3 w-full min-w-0 h-12 min-h-12 px-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-colors group ${
          selected ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-200 dark:border-indigo-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
        }`}
        onClick={() => onNotebookSelect(notebook)}
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: notebook.color }} />
        <Book className={`flex-shrink-0 ${selected ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`} size={18} />
        <span className={`font-medium truncate flex-1 min-w-0 text-sm ${selected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>{notebook.name}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{notebook.notes_count} {notebook.notes_count === 1 ? 'note' : 'notes'}</span>
        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {onToggleFavorite && !notebook.is_archived && (
            <button onClick={() => onToggleFavorite(notebook.id)} className={`p-1 rounded ${notebook.is_favorite ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-600'}`} title={notebook.is_favorite ? 'Unfavorite' : 'Favorite'}>
              <Star size={12} fill={notebook.is_favorite ? 'currentColor' : 'none'} />
            </button>
          )}
          <div className="relative" ref={openOptionsNotebookId === notebook.id ? compactOptionsMenuRef : undefined}>
            <button
              onClick={(e) => { e.stopPropagation(); setOpenOptionsNotebookId((id) => (id === notebook.id ? null : notebook.id)); }}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              title="Options"
              aria-label="Notebook options"
            >
              <Settings size={14} />
            </button>
            {openOptionsNotebookId === notebook.id && (
              <div className="absolute right-0 top-full mt-1 min-w-[140px] bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow-lg z-50 py-1">
                <button onClick={() => { setNotebookToEdit(notebook); setShowEditModal(true); setOpenOptionsNotebookId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] flex items-center gap-2 rounded-md mx-0.5">
                  <Edit size={12} /> Edit
                </button>
                <button onClick={() => { onColorChange(notebook); setOpenOptionsNotebookId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] flex items-center gap-2 rounded-md mx-0.5">
                  <Palette size={12} /> Color
                </button>
                {!notebook.is_archived && (
                  <button onClick={() => { setNotebookToShare(notebook); setShowShareModal(true); setOpenOptionsNotebookId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] flex items-center gap-2 rounded-md mx-0.5">
                    <Share2 size={12} /> Share
                  </button>
                )}
                {notebook.is_archived ? (
                  <button onClick={() => { onArchiveNotebook(notebook.id, false); setOpenOptionsNotebookId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] flex items-center gap-2 rounded-md mx-0.5">
                    <RotateCcw size={12} /> Unarchive
                  </button>
                ) : (
                  <button onClick={() => { onArchiveNotebook(notebook.id, true); setOpenOptionsNotebookId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] flex items-center gap-2 rounded-md mx-0.5">
                    <Archive size={12} /> Archive
                  </button>
                )}
                <button onClick={() => { setNotebookToDelete(notebook); setOpenOptionsNotebookId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-md mx-0.5">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Notebooks list */}
      <div
        className={`overflow-y-auto flex-1 ${isCompact ? 'flex flex-col gap-1' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}`}
        style={isCompact ? undefined : { alignContent: 'start' }}
      >
        {notebooks.length === 0 && (
          <div className={isCompact ? 'py-8' : 'col-span-full'}>
            <div className="flex items-center justify-center h-40 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No notebooks found</h3>
                <p className="text-gray-500 dark:text-gray-400">Try adjusting your search terms</p>
              </div>
            </div>
          </div>
        )}
        {isCompact ? notebooks.map(renderCompactRow) : notebooks.map((notebook) => (
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
                <div className="h-16 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: notebook.color }}>
                  <Book className={`${selectedNotebook?.id === notebook.id ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400'}`} size={24} />
                </div>
                <div className={`font-semibold text-lg mb-auto p-4 pb-2 truncate ${selectedNotebook?.id === notebook.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
                  {notebook.name}
                </div>
                <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-600 flex-shrink-0">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {notebook.notes_count} {notebook.notes_count === 1 ? 'note' : 'notes'}
                  </span>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {onToggleFavorite && !notebook.is_archived && (
                      <button
                        onClick={() => onToggleFavorite(notebook.id)}
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
                    <div className="relative" ref={openOptionsNotebookId === notebook.id ? compactOptionsMenuRef : undefined}>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setOpenOptionsNotebookId((id) => (id === notebook.id ? null : notebook.id));
                        }}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                        title="Options"
                        aria-label="Notebook options"
                      >
                        <Settings size={14} />
                      </button>
                      {openOptionsNotebookId === notebook.id && (
                        <div className="absolute right-0 bottom-full mb-1 min-w-[140px] bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow-lg z-50 py-1">
                          <button onClick={() => { setNotebookToEdit(notebook); setShowEditModal(true); setOpenOptionsNotebookId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] flex items-center gap-2 rounded-md mx-0.5">
                            <Edit size={12} /> Edit
                          </button>
                          <button onClick={() => { onColorChange(notebook); setOpenOptionsNotebookId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] flex items-center gap-2 rounded-md mx-0.5">
                            <Palette size={12} /> Color
                          </button>
                          {!notebook.is_archived && (
                            <button onClick={() => { setNotebookToShare(notebook); setShowShareModal(true); setOpenOptionsNotebookId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] flex items-center gap-2 rounded-md mx-0.5">
                              <Share2 size={12} /> Share
                            </button>
                          )}
                          {notebook.is_archived ? (
                            <button onClick={() => { onArchiveNotebook(notebook.id, false); setOpenOptionsNotebookId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] flex items-center gap-2 rounded-md mx-0.5">
                              <RotateCcw size={12} /> Unarchive
                            </button>
                          ) : (
                            <button onClick={() => { onArchiveNotebook(notebook.id, true); setOpenOptionsNotebookId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] flex items-center gap-2 rounded-md mx-0.5">
                              <Archive size={12} /> Archive
                            </button>
                          )}
                          <button onClick={() => { setNotebookToDelete(notebook); setOpenOptionsNotebookId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-md mx-0.5">
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
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

      {/* Bulk Delete Modal - dtrack style */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => {
              setShowBulkDeleteModal(false);
              setSelectedNotebooksForDelete([]);
            }}
          />
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative flex flex-col bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl border border-gray-200 dark:border-[#333333] max-w-4xl w-full min-h-[36rem] max-h-[90vh] overflow-hidden z-[101]" onClick={e => e.stopPropagation()}>
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-[#333333] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Delete Notebooks</h3>
                <button
                  onClick={() => {
                    setShowBulkDeleteModal(false);
                    setSelectedNotebooksForDelete([]);
                  }}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 py-3">
                <p className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Select notebooks to delete. This will also delete all notes in these notebooks.
                </p>
                {selectedNotebooksForDelete.length > 0 && (
                  <p className="flex-shrink-0 mb-2 text-xs text-red-600 dark:text-red-400">
                    {selectedNotebooksForDelete.length} notebook{selectedNotebooksForDelete.length > 1 ? 's' : ''} selected for deletion
                  </p>
                )}
                <div className="flex-1 min-h-0 overflow-y-scroll border border-gray-200 dark:border-[#333333] rounded-md">
                        {notebooks.map((notebook) => (
                          <div key={notebook.id} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] border-b border-gray-100 dark:border-[#333333] last:border-b-0">
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
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`notebook-${notebook.id}`} className="ml-4 flex items-center flex-1 cursor-pointer">
                              <div 
                                className="w-8 h-8 rounded-lg mr-4 shadow-sm"
                                style={{ backgroundColor: notebook.color }}
                              ></div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {notebook.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
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
              </div>
              <div className="flex-shrink-0 px-4 py-2.5 border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#252525] rounded-b-md flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkDeleteModal(false);
                    setSelectedNotebooksForDelete([]);
                  }}
                  className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-[#333333] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
                >
                  Cancel
                </button>
                <div
                  className="relative inline-flex"
                  onMouseEnter={() => setDeleteButtonTooltip(true)}
                  onMouseLeave={() => setDeleteButtonTooltip(false)}
                >
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
                    className="px-2.5 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete {selectedNotebooksForDelete.length > 0 ? `(${selectedNotebooksForDelete.length})` : ''}
                  </button>
                  {deleteButtonTooltip && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg whitespace-nowrap z-[102] shadow pointer-events-none"
                      role="tooltip"
                    >
                      {selectedNotebooksForDelete.length > 0 ? `Delete ${selectedNotebooksForDelete.length} selected notebook${selectedNotebooksForDelete.length > 1 ? 's' : ''}` : 'Select notebooks to delete first'}
                    </div>
                  )}
                </div>
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