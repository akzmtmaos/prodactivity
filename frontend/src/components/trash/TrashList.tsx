import React from 'react';
import type { TrashItem } from '../../pages/Trash';
import { RotateCcw, Trash2 } from 'lucide-react';

interface TrashListProps {
  items: TrashItem[];
  onRestore: (id: string, type: 'note' | 'deck' | 'reviewer') => void;
  onDelete: (id: string, type: 'note' | 'deck' | 'reviewer') => void;
}

const TrashList: React.FC<TrashListProps> = ({ items, onRestore, onDelete }) => {
  if (items.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        No deleted items found.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Invisible table header for alignment */}
      <div className="hidden sm:grid grid-cols-5 gap-4 px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
        <div>Title</div>
        <div>Type</div>
        <div>Deleted At</div>
        <div>Days Left</div>
        <div className="text-center">Actions</div>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {items.map((item) => {
          // Calculate days left before permanent deletion
          const deletedAt = new Date(item.deletedAt);
          const now = new Date();
          const msInDay = 1000 * 60 * 60 * 24;
          const daysSinceDeleted = Math.floor((now.getTime() - deletedAt.getTime()) / msInDay);
          const daysLeft = Math.max(0, 30 - daysSinceDeleted);
          return (
            <div
              key={item.id}
              className="flex flex-col sm:grid sm:grid-cols-5 gap-4 items-center px-2 py-4"
            >
              <div className="w-full text-gray-900 dark:text-white font-medium truncate text-center sm:text-left">{item.title}</div>
              <div className="w-full text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left capitalize">{item.type}</div>
              <div className="w-full text-xs text-gray-400 text-center sm:text-left">{deletedAt.toLocaleString()}</div>
              <div className="w-full text-xs text-gray-400 text-center sm:text-left">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</div>
              <div className="flex justify-center sm:justify-end gap-2 w-full">
                <button
                  className="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition"
                  onClick={() => onRestore(item.id, item.type)}
                  aria-label="Restore"
                  title="Restore"
                >
                  <RotateCcw size={18} />
                </button>
                <button
                  className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition"
                  onClick={() => onDelete(item.id, item.type)}
                  aria-label="Delete"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrashList; 