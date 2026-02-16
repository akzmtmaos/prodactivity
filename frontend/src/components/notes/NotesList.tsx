// frontend/src/components/NotesList.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronRight, FileText, BookOpen, Trash2, Archive, RotateCcw, Edit, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import NoteItem from './NoteItem';
import NoteForm from './NoteForm';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';

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

interface Note {
  id: number;
  title: string;
  content: string;
  notebook: number;
  notebook_name: string;
  notebook_type: string;
  notebook_urgency: string;
  notebook_color: string;
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

interface NotesListProps {
  selectedNotebook: Notebook | null;
  notes: Note[];
  isAddingNote: boolean;
  editingNote: Note | null;
  noteTitle: string;
  noteContent: string;
  onStartAddingNote: () => void;
  onCancelAddingNote: () => void;
  onAddNote: () => void;
  onEditNote: (note: Note) => void;
  onCancelEditingNote: () => void;
  onUpdateNote: () => void;
  onDeleteNote: (noteId: number) => void;
  onNoteTitleChange: (title: string) => void;
  onNoteContentChange: (content: string) => void;
  onUpdateNoteTitle: (noteId: number, newTitle: string) => void;
  onBulkDelete: (noteIds: number[]) => void;
  onArchiveNote: (noteId: number, archive: boolean) => void;
  onToggleImportant: (noteId: number) => void;
  deletingNoteId?: number | null;
  onSelectionChange?: (selectedIds: number[]) => void;
  selectedForBulk?: number[];
  listViewMode?: 'compact' | 'comfortable';
}

const NotesList: React.FC<NotesListProps> = ({
  selectedNotebook,
  notes,
  isAddingNote,
  editingNote,
  noteTitle,
  noteContent,
  onStartAddingNote,
  onCancelAddingNote,
  onAddNote,
  onEditNote,
  onCancelEditingNote,
  onUpdateNote,
  onDeleteNote,
  onNoteTitleChange,
  onNoteContentChange,
  onUpdateNoteTitle,
  onBulkDelete,
  onArchiveNote,
  onToggleImportant,
  deletingNoteId,
  onSelectionChange,
  selectedForBulk = [],
  listViewMode = 'comfortable',
}) => {
  // Local selection UI removed; bulk delete handled via notebook header modal
  const [openOptionsNoteId, setOpenOptionsNoteId] = useState<number | null>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setOpenOptionsNoteId(null);
      }
    };
    if (openOptionsNoteId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openOptionsNoteId]);

  if (!selectedNotebook) {
    return (
      <div className="w-full h-[calc(100vh-12rem)]">
        <div className="p-5 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400 dark:text-white" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No notebook selected
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a notebook to view and manage notes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-12rem)] flex flex-col">
      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Add note form */}
        {isAddingNote && (
          <NoteForm
            title={noteTitle}
            content={noteContent}
            onTitleChange={onNoteTitleChange}
            onContentChange={onNoteContentChange}
            onSave={onAddNote}
            onCancel={onCancelAddingNote}
          />
        )}
        
        {/* Notes list */}
        <div className={listViewMode === 'compact' ? 'flex flex-col gap-1' : 'space-y-4'}>
          {notes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-white" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No notes
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new note.
              </p>
            </div>
          ) : listViewMode === 'compact' ? (
            notes.map((note) => (
              <div
                key={note.id}
                className="flex items-center gap-3 w-full min-w-0 h-12 px-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                onClick={() => onEditNote(note)}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: note.notebook_color }} />
                <FileText className="flex-shrink-0 text-gray-500 dark:text-gray-400" size={18} />
                <span className="font-medium truncate flex-1 min-w-0 text-sm text-gray-800 dark:text-gray-200">{note.title || 'Untitled'}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}</span>
                <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" ref={openOptionsNoteId === note.id ? optionsMenuRef : undefined} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenOptionsNoteId((id) => (id === note.id ? null : note.id)); }}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                    title="Options"
                    aria-label="Note options"
                  >
                    <Settings size={14} />
                  </button>
                  {openOptionsNoteId === note.id && (
                    <div className="absolute right-0 top-full mt-1 min-w-[120px] bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow-lg z-50 py-1">
                      <button onClick={() => { onEditNote(note); setOpenOptionsNoteId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] flex items-center gap-2 rounded-md mx-0.5">
                        <Edit size={12} /> Edit
                      </button>
                      <button onClick={() => { onArchiveNote(note.id, !note.is_archived); setOpenOptionsNoteId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] flex items-center gap-2 rounded-md mx-0.5">
                        {note.is_archived ? <><RotateCcw size={12} /> Unarchive</> : <><Archive size={12} /> Archive</>}
                      </button>
                      <button onClick={() => { onDeleteNote(note.id); setOpenOptionsNoteId(null); }} className="w-full px-2.5 py-1.5 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-md mx-0.5">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <>
              {notes.map((note) => (
                <div key={note.id} className="flex items-center">
                  <div className="flex-1">
                    <NoteItem
                      note={note}
                      onEdit={onEditNote}
                      onEditTitle={(updatedNote) => onUpdateNoteTitle(updatedNote.id, updatedNote.title)}
                      onDelete={() => onDeleteNote(note.id)}
                      onArchive={() => onArchiveNote(note.id, !note.is_archived)}
                      onToggleImportant={() => onToggleImportant(note.id)}
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotesList;