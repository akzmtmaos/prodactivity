import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface Reviewer {
  id: number;
  title: string;
  content: string;
  tags?: string[];
}

interface EditReviewerModalProps {
  isOpen: boolean;
  reviewer: Reviewer | null;
  onClose: () => void;
  onSave: (id: number, title: string, content: string) => Promise<void>;
}

const EditReviewerModal: React.FC<EditReviewerModalProps> = ({
  isOpen,
  reviewer,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && reviewer) {
      setTitle(reviewer.title || '');
      setContent(reviewer.content || '');
      setError(null);
    }
  }, [isOpen, reviewer]);

  if (!isOpen || !reviewer) return null;

  const isQuiz =
    (reviewer.tags?.includes('quiz') ?? false) || reviewer.title.startsWith('Quiz:');
  const entityLabel = isQuiz ? 'quiz' : 'reviewer';

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(reviewer.id, title.trim(), content.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setTitle(reviewer.title || '');
      setContent(reviewer.content || '');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] dark:bg-black/60">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-7 pb-4 pt-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
              Edit {entityLabel}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Make your changes, then save them to this {entityLabel}.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            aria-label="Close"
            className="-mr-1 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 overflow-y-auto border-t border-gray-100 px-7 py-5 dark:border-gray-800">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-entity-title"
              className="block text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500"
            >
              Title
            </label>
            <input
              id="edit-entity-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              autoFocus
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500/60"
              placeholder="Give this a clear, descriptive title"
            />
          </div>

          {/* Content Textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-entity-content"
              className="block text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500"
            >
              Content
            </label>
            <textarea
              id="edit-entity-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSaving}
              rows={18}
              className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-mono text-[13px] leading-6 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500/60"
              placeholder="Write the content here..."
            />
            <p className="pt-0.5 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
              {isQuiz
                ? 'Keep each question in the Q1. / A) / Answer: format so the quiz stays playable.'
                : 'Add sections, refine wording, or update the source material.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-7 py-3.5 dark:border-gray-800">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !content.trim()}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditReviewerModal;
