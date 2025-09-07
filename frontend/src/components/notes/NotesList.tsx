// frontend/src/components/NotesList.tsx
import React, { useState } from 'react';
import { Plus, ChevronRight, FileText, BookOpen, Trash2, Archive, RotateCcw } from 'lucide-react';
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
}) => {
  const [selectedNotes, setSelectedNotes] = useState<number[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const handleNoteSelect = (noteId: number) => {
    setSelectedNotes(prev => {
      if (prev.includes(noteId)) {
        return prev.filter(id => id !== noteId);
      } else {
        return [...prev, noteId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedNotes.length === notes.length) {
      setSelectedNotes([]);
    } else {
      setSelectedNotes(notes.map(note => note.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedNotes.length > 0) {
      setShowBulkDeleteModal(true);
    }
  };

  const handleConfirmBulkDelete = () => {
    onBulkDelete(selectedNotes);
    setSelectedNotes([]);
    setShowBulkDeleteModal(false);
  };

  if (!selectedNotebook) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow h-[calc(100vh-12rem)]">
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
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow h-[calc(100vh-12rem)] flex flex-col">
      {/* Bulk Delete Button - Only show when notes are selected */}
      {selectedNotes.length > 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} />
              <span>Delete Selected ({selectedNotes.length})</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="p-5 flex-1 overflow-y-auto">
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
        <div className="space-y-4">
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
          ) : (
            <>
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  checked={selectedNotes.length === notes.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Select All
                </span>
              </div>
              {notes.map((note) => (
                <div key={note.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedNotes.includes(note.id)}
                    onChange={() => handleNoteSelect(note.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
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

      {/* Bulk Delete Modal */}
      <DeleteConfirmationModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Selected Notes"
        message={`Are you sure you want to delete ${selectedNotes.length} selected note${selectedNotes.length > 1 ? 's' : ''}?`}
      />
    </div>
  );
};

export default NotesList;