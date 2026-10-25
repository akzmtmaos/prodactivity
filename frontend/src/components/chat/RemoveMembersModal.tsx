import React, { useState, useMemo } from 'react';
import { X, Users, Check } from 'lucide-react';
import { User } from './types';
import { getAvatarUrl } from './utils';

interface RemoveMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  currentUserId: string;
  participants: User[];
  ownerId?: string | null | undefined;
  onRemove: (userIds: string[]) => Promise<void>;
}

const RemoveMembersModal: React.FC<RemoveMembersModalProps> = ({
  isOpen,
  onClose,
  roomName,
  currentUserId,
  participants,
  ownerId,
  onRemove,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerIdString = ownerId != null ? String(ownerId) : undefined;

  const removableParticipants = useMemo(() => {
    return participants.filter(
      (p) => String(p.id) !== currentUserId && String(p.id) !== ownerIdString,
    );
  }, [participants, currentUserId, ownerIdString]);

  const allRemovableIds = useMemo(
    () => new Set(removableParticipants.map((p) => String(p.id))),
    [removableParticipants],
  );

  const effectiveSelected = useMemo(() => {
    return new Set(
      Array.from(selectedIds).filter((id) => allRemovableIds.has(id)),
    );
  }, [selectedIds, allRemovableIds]);

  React.useEffect(() => {
    setSelectedIds(effectiveSelected);
  }, [effectiveSelected]);

  const toggleUser = (id: string) => {
    if (!allRemovableIds.has(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllRemovable = () => {
    setSelectedIds((prev) => new Set([...prev, ...allRemovableIds]));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (effectiveSelected.size === 0) {
      setError('Select at least one person to remove');
      return;
    }
    setSubmitting(true);
    try {
      await onRemove(Array.from(effectiveSelected));
      setSelectedIds(new Set());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove members');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} aria-hidden />
      <div
        className="relative bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-[#333333] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30 shrink-0">
              <Users className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Remove members from {roomName || 'group'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {effectiveSelected.size > 0
                  ? `${effectiveSelected.size} selected`
                  : 'No one selected'}
              </p>
              {allRemovableIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllRemovable}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:underline font-medium"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

            {removableParticipants.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                <Users className="mx-auto h-7 w-7 mb-1.5 opacity-50" />
                <p>No one else to remove</p>
              </div>
            ) : (
              <ul className="max-h-64 overflow-y-auto rounded-md border border-gray-200 dark:border-[#333333] divide-y divide-gray-200 dark:divide-[#333333]">
                {removableParticipants.map((p) => {
                  const pid = String(p.id);
                  const isSelected = effectiveSelected.has(pid);
                  return (
                    <li key={pid}>
                      <button
                        type="button"
                        onClick={() => toggleUser(pid)}
                        className={`w-full flex items-center gap-3 p-2 text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-[#2d2d2d]'}`}
                      >
                        <div className="relative flex h-5 w-5 shrink-0">
                          <div
                            className={`flex items-center justify-center rounded-full border-2 transition-colors ${
                              isSelected
                                ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-600 dark:bg-indigo-400'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#252525]'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="h-3 w-3 text-white" />
                            ) : (
                              <span className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          {p.avatar ? (
                            <img
                              src={getAvatarUrl(p.avatar) ?? ''}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30"
                            />
                          ) : (
                            <div                              className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                {(p.username || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="flex-1 truncate text-sm text-gray-900 dark:text-white">
                            {p.username || 'someone'}
                          </span>


                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-200 dark:border-[#333333] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-md font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || effectiveSelected.size === 0}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Removing...' : 'Remove members'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RemoveMembersModal;
