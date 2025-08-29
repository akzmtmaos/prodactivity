// frontend/src/components/notes/NotebookSidebar.tsx
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Book, ChevronLeft, ChevronRight, Save, X, FileText } from 'lucide-react';

interface Notebook {
  id: number;
  name: string;
  notebook_type: 'study' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other';
  urgency_level: 'normal' | 'important' | 'urgent' | 'critical';
  description: string;
  created_at: string;
  updated_at: string;
  notes_count: number;
}

interface Note {
  id: number;
  title: string;
  content: string;
  notebook: number;
  notebook_name: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

interface NotebookSidebarProps {
  notebooks: Notebook[];
  notes: Note[];
  selectedNotebook: Notebook | null;
  selectedNote: Note | null;
  collapsed: boolean;
  onNotebookSelect: (notebook: Notebook) => void;
  onNotebookAdd: (name: string) => Promise<Notebook>;
  onNotebookUpdate: (notebookId: number, name: string) => Promise<Notebook>;
  onNotebookDelete: (notebookId: number) => void;
  onNoteSelect: (note: Note) => void;
  onNoteCreate: (title: string, content: string) => Promise<Note>;
  onNoteDelete: (noteId: number) => void;
  onToggleCollapse: () => void;
}

const NotebookSidebar: React.FC<NotebookSidebarProps> = ({
  notebooks,
  notes,
  selectedNotebook,
  selectedNote,
  collapsed,
  onNotebookSelect,
  onNotebookAdd,
  onNotebookUpdate,
  onNotebookDelete,
  onNoteSelect,
  onNoteCreate,
  onNoteDelete,
  onToggleCollapse,
}) => {
  const [isAddingNotebook, setIsAddingNotebook] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [notebookName, setNotebookName] = useState('');

  const handleAddNotebook = async () => {
    if (!notebookName.trim()) return;
    
    try {
      await onNotebookAdd(notebookName);
      setIsAddingNotebook(false);
      setNotebookName('');
    } catch (error) {
      // Error handled in parent component
    }
  };

  const handleUpdateNotebook = async () => {
    if (!editingNotebook || !notebookName.trim()) return;
    
    try {
      await onNotebookUpdate(editingNotebook.id, notebookName);
      setEditingNotebook(null);
      setNotebookName('');
    } catch (error) {
      // Error handled in parent component
    }
  };

  const handleCreateNewNote = async () => {
    if (!selectedNotebook) return;
    
    try {
      await onNoteCreate('Untitled Note', '');
    } catch (error) {
      // Error handled in parent component
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const truncateTitle = (title: string, maxLength: number = 30) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  };

  return (
    <div className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-10 ${
      collapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center">
            <Book className="inline-block mr-2" size={20} />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Notebooks
            </h2>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          {/* Add Notebook Button */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsAddingNotebook(true)}
              className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              New Notebook
            </button>
          </div>

          {/* Add Notebook Form */}
          {isAddingNotebook && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <input
                type="text"
                value={notebookName}
                onChange={(e) => setNotebookName(e.target.value)}
                placeholder="Notebook name"
                className="w-full mb-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddNotebook}
                  className="flex items-center px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Save size={14} className="mr-1" />
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsAddingNotebook(false);
                    setNotebookName('');
                  }}
                  className="flex items-center px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  <X size={14} className="mr-1" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Notebooks List */}
          <div className="p-2">
            {notebooks.map((notebook) => (
              <div key={notebook.id} className="mb-2">
                {editingNotebook?.id === notebook.id ? (
                  <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <input
                      type="text"
                      value={notebookName}
                      onChange={(e) => setNotebookName(e.target.value)}
                      className="w-full mb-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateNotebook}
                        className="flex items-center px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        <Save size={14} className="mr-1" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingNotebook(null);
                          setNotebookName('');
                        }}
                        className="flex items-center px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                      >
                        <X size={14} className="mr-1" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedNotebook?.id === notebook.id
                          ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                      onClick={() => onNotebookSelect(notebook)}
                    >
                      <div className="flex items-center min-w-0">
                        {selectedNotebook?.id === notebook.id ? (
                          <Book className="mr-3 flex-shrink-0" size={18} />
                        ) : (
                          <Book className="mr-3 flex-shrink-0" size={18} />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{notebook.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {notebook.notes_count} notes
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNotebook(notebook);
                            setNotebookName(notebook.name);
                          }}
                          className="p-1 text-gray-500 hover:text-indigo-600 mr-1"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete notebook "${notebook.name}"? This will also delete all notes in this notebook.`)) {
                              onNotebookDelete(notebook.id);
                            }
                          }}
                          className="p-1 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Notes list for selected notebook */}
                    {selectedNotebook?.id === notebook.id && (
                      <div className="ml-4 mt-2 space-y-1">
                        <button
                          onClick={handleCreateNewNote}
                          className="w-full flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        >
                          <Plus size={14} className="mr-2" />
                          New Note
                        </button>
                        
                        {notes.map((note) => (
                          <div
                            key={note.id}
                            className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedNote?.id === note.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                            onClick={() => onNoteSelect(note)}
                          >
                            <div className="flex items-center min-w-0">
                              <FileText className="mr-2 flex-shrink-0" size={14} />
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {truncateTitle(note.title)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(note.updated_at)}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete note "${note.title}"?`)) {
                                  onNoteDelete(note.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-600 transition-opacity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotebookSidebar;