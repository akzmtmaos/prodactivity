import React, { useState, useEffect } from 'react';
import { X, Search, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { User } from './types';
import { getAvatarUrl } from './utils';

interface AddMembersToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  currentUserId: string;
  currentParticipantIds: string[];
  onAdded: () => void;
}

const AddMembersToGroupModal: React.FC<AddMembersToGroupModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  currentUserId,
  currentParticipantIds,
  onAdded,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const participantSet = new Set(currentParticipantIds.map(String));

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIds(new Set());
      setAllUsers([]);
      setError(null);
    }
  }, [isOpen, currentUserId]);

  // Only fetch users when user types a search (min 2 characters)
  useEffect(() => {
    const q = searchTerm.trim();
    if (!q || q.length < 2) {
      setAllUsers([]);
      return;
    }
    const search = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: e } = await supabase
          .from('profiles')
          .select('id, username, email, avatar')
          .neq('id', currentUserId)
          .or(`username.ilike.%${q}%,email.ilike.%${q}%`)
          .order('username', { ascending: true })
          .limit(25);
        if (e) throw e;
        const list = (data || []).map((u: any) => ({
          ...u,
          id: String(u.id),
          avatar: getAvatarUrl(u.avatar),
        }));
        setAllUsers(list);
      } catch (err: any) {
        setError(err?.message || 'Failed to search users');
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(search, 200);
    return () => clearTimeout(t);
  }, [searchTerm, currentUserId]);

  const availableUsers = allUsers.filter((u) => !participantSet.has(u.id));

  const toggleUser = (id: string) => {
    if (participantSet.has(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setError('Select at least one member to add');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const toInsert = Array.from(selectedIds).map((user_id) => ({
        room_id: roomId,
        user_id,
      }));
      const { error: insertError } = await supabase.from('room_participants').insert(toInsert);
      if (insertError) throw insertError;
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add members');
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
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Add members to {roomName || 'group'}</h2>
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
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-gray-900 dark:text-white"
              />
            </div>
            {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
            <div className="max-h-56 overflow-y-auto rounded-md border border-gray-200 dark:border-[#333333]">
              {loading ? (
                <div className="p-3 text-xs text-gray-500 dark:text-gray-400">Searching...</div>
              ) : !searchTerm.trim() ? (
                <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                  <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>Type at least 2 characters to search for users</p>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="p-3 text-xs text-gray-500 dark:text-gray-400">
                  {allUsers.length === 0 ? 'No users found' : 'All searched users are already in the group'}
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-[#333333]">
                  {availableUsers.map((u) => {
                    const isSelected = selectedIds.has(u.id);
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => toggleUser(u.id)}
                          className={`w-full flex items-center gap-2 p-2 text-left text-sm rounded-none ${
                            isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-[#2d2d2d]'
                          }`}
                        >
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                                {(u.username || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="flex-1 truncate text-gray-900 dark:text-white">{u.username}</span>
                          {isSelected && (
                            <span className="text-indigo-600 dark:text-indigo-400 text-xs font-medium">Add</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {selectedIds.size > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedIds.size} selected</p>
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
              disabled={submitting || selectedIds.size === 0}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add members'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMembersToGroupModal;
