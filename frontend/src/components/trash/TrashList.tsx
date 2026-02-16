import React from 'react';
import type { TrashItem } from '../../pages/Trash';
import { RotateCcw, Trash2 } from 'lucide-react';

interface TrashListProps {
  items: TrashItem[];
  onRestore: (id: string, type: 'note' | 'deck' | 'notebook' | 'reviewer' | 'task' | 'flashcard' | 'quiz') => void;
  onDelete: (id: string, type: 'note' | 'deck' | 'notebook' | 'reviewer' | 'task' | 'flashcard' | 'quiz') => void;
  selectedItems: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  note: 'Note',
  notes: 'Note',
  deck: 'Deck',
  notebook: 'Notebook',
  reviewer: 'Reviewer',
  quiz: 'Quiz',
  task: 'Task',
  flashcard: 'Flashcard',
};

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const TrashList: React.FC<TrashListProps> = ({ items, onRestore, onDelete, selectedItems, onToggleSelection, onSelectAll }) => {
  if (items.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
        No deleted items found.
      </div>
    );
  }

  const allSelected = items.length > 0 && items.every(item => selectedItems.has(item.id));

  return (
    <div className="w-full flex flex-col gap-1">
      {/* Select all row – compact */}
      <div className="flex items-center gap-3 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onSelectAll}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer flex-shrink-0"
        />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Select all</span>
      </div>

      {/* List rows – compact, same height as Decks/Notebooks */}
      {items.map((item) => {
        const deletedAt = new Date(item.deletedAt);
        const now = new Date();
        const msInDay = 1000 * 60 * 60 * 24;
        const daysSinceDeleted = Math.floor((now.getTime() - deletedAt.getTime()) / msInDay);
        const daysLeft = Math.max(0, 30 - daysSinceDeleted);
        const isSelected = selectedItems.has(item.id);
        const typeLabel = TYPE_LABELS[item.type] || item.type;

        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 w-full min-w-0 h-12 min-h-12 px-3 rounded-lg border transition-colors group ${
              isSelected
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection(item.id)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="flex-shrink-0 px-2 py-0.5 text-[11px] font-medium rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {typeLabel}
            </span>
            <span className="font-medium truncate flex-1 min-w-0 text-sm text-gray-900 dark:text-white">
              {item.title || 'Untitled'}
            </span>
            <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
              {formatShortDate(item.deletedAt)} · {daysLeft}d left
            </span>
            <div
              className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onRestore(item.id, item.type)}
                className="p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                aria-label="Restore"
                title="Restore"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item.id, item.type)}
                className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                aria-label="Delete permanently"
                title="Delete permanently"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrashList;
