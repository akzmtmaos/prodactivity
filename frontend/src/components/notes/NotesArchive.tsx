// frontend/src/components/notes/NotesArchive.tsx
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Archive as ArchiveIcon, Book } from 'lucide-react';

const ARCHIVE_PER_PAGE = 20;

interface Notebook {
  id: number;
  name: string;
  notebook_type: 'study' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other';
  color: string;
  created_at: string;
  updated_at: string;
  notes_count: number;
  is_archived: boolean;
  archived_at: string | null;
  is_favorite?: boolean;
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

interface ArchiveProps {
  notebooks: Notebook[];
  notes: Note[];
  onArchiveNotebook: (notebookId: number, archive: boolean) => void;
  onArchiveNote: (noteId: number, archive: boolean) => void;
  onDeleteNotebook: (notebookId: number) => void;
  onDeleteNote: (noteId: number) => void;
  onEditNotebook?: (notebook: Notebook | Note) => void;
  activeFilter?: 'all' | 'notebook' | 'note';
  setFilter?: (filter: 'all' | 'notebook' | 'note') => void;
  /** Page supplied by the parent header pager */
  currentPage?: number;
}

const NotesArchive: React.FC<ArchiveProps> = ({
  notebooks,
  notes,
  onArchiveNotebook,
  onArchiveNote,
  onDeleteNotebook,
  onDeleteNote,
  onEditNotebook,
  activeFilter,
  setFilter,
  currentPage = 1,
}) => {
  // Build a flat merged stream: each row carries its type, label, title, dates, color, and handlers.
  const rows: Array<{
    id: number;
    type: 'notebook' | 'note';
    label: 'NOTEBOOK' | 'NOTE';
    title: string;
    archivedAt: Date | null;
    updatedAt: Date | null;
    color: string;
    onArchive: (id: number, archive: boolean) => void;
    onDelete: (id: number) => void;
  }> = [];

  notebooks.forEach((nb) => {
    rows.push({
      id: nb.id,
      type: 'notebook',
      label: 'NOTEBOOK',
      title: nb.name,
      archivedAt: nb.archived_at ? new Date(nb.archived_at) : null,
      updatedAt: nb.archived_at ? new Date(nb.archived_at) : new Date(nb.updated_at),
      color: nb.color,
      onArchive: (archiveId, archive) => onArchiveNotebook(archiveId, archive),
      onDelete: (notebookId) => onDeleteNotebook(notebookId),
    });
  });

  notes.forEach((note) => {
    rows.push({
      id: note.id,
      type: 'note',
      label: 'NOTE',
      title: note.title || 'Untitled',
      archivedAt: note.archived_at ? new Date(note.archived_at) : null,
      updatedAt: note.archived_at ? new Date(note.archived_at) : new Date(note.updated_at),
      color: '#6366f1',
      onArchive: (archiveId, archive) => onArchiveNote(archiveId, archive),
      onDelete: (noteId) => onDeleteNote(noteId),
    });
  });

  // Interleave notes + notebooks by archived date (newest first).
  rows.sort((a, b) => {
    const aTime = a.archivedAt?.getTime() ?? -Infinity;
    const bTime = b.archivedAt?.getTime() ?? -Infinity;
    return bTime - aTime;
  });

  // Apply the All/Notebooks/Notes type filter on the merged stream.
  const filteredRows = activeFilter === 'notebook'
    ? rows.filter((r) => r.type === 'notebook')
    : activeFilter === 'note'
      ? rows.filter((r) => r.type === 'note')
      : rows;

  // Slice the merged archive stream; the parent header pager owns the page state
  const pageStart = (Math.max(1, currentPage) - 1) * ARCHIVE_PER_PAGE;
  const paginatedRows = filteredRows.slice(pageStart, pageStart + ARCHIVE_PER_PAGE);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
        <Book className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <div className="flex items-center gap-1">
          <button                    onClick={() => setFilter?.('all')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${activeFilter === 'all' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
          >
            All
          </button>
          <button                    onClick={() => setFilter?.('notebook')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${activeFilter === 'notebook' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
          >
            Notebooks
          </button>
          <button                    onClick={() => setFilter?.('note')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${activeFilter === 'note' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
          >
            Notes
          </button>
        </div>
      </div>
      <div data-notes-scroll className="flex-1 min-h-0 overflow-y-auto">
        {filteredRows.length === 0 ? (
          <div className="flex items-center justify-center h-full py-12">
            <div className="text-center">
              <ArchiveIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No archived items
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Items you archive will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {paginatedRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-3 w-full min-w-0 h-12 px-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                onClick={() => onEditNotebook?.(row.type === 'notebook' ? ({ id: row.id, name: row.title, color: row.color } as unknown as Notebook) : ({ id: row.id, title: row.title, color: row.color } as unknown as Note))}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                <Book className="flex-shrink-0 text-gray-500 dark:text-gray-400" size={18} />
                <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {row.label}
                </span>
                <span className="font-medium truncate flex-1 min-w-0 text-sm text-gray-800 dark:text-gray-200">
                  {row.title}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {formatDistanceToNow(row.archivedAt ?? row.updatedAt ?? new Date(), { addSuffix: true })}
                </span>
                <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      row.onArchive(row.id, false);
                    }}
                    className="p-1.5 h-7 w-7 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                    aria-label="Archive"
                  >
                    <ArchiveIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      row.onDelete(row.id);
                    }}
                    className="p-1.5 h-7 w-7 rounded-md border border-gray-300 dark:border-gray-700 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors"
                    aria-label="Delete"
                  >
                    <Book className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesArchive;
