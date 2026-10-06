import React, { useState, useEffect, useMemo } from 'react';
import { X, AtSign, AlertCircle, Check } from 'lucide-react';
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

interface ParsedEntry {
  raw: string;
  email: string;
  status: 'valid-unmatched' | 'matched' | 'already-in-group' | 'invalid' | 'unknown';
  profile?: User;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().replace(/[<>]/g, '');
}

function parseEmailsInput(raw: string, participantSet: Set<string>, profilesByEmail: Map<string, User>): ParsedEntry[] {
  const seen = new Set<string>();
  const entries: ParsedEntry[] = [];

  const tokens = raw.split(/[,\n]+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return entries;

  for (const token of tokens) {
    const email = normalizeEmail(token);
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);

    if (!EMAIL_RE.test(email)) {
      entries.push({ raw: token, email, status: 'invalid' });
      continue;
    }

    const profile = profilesByEmail.get(email);
    if (!profile) {
      entries.push({ raw: token, email, status: 'unknown' });
      continue;
    }

    const pid = String(profile.id);
    if (participantSet.has(pid)) {
      entries.push({ raw: token, email, status: 'already-in-group', profile });
      continue;
    }

    entries.push({ raw: token, email, status: 'matched', profile });
  }

  return entries;
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
  const [emailInput, setEmailInput] = useState('');
  const [profilesByEmail, setProfilesByEmail] = useState<Map<string, User>>(new Map());
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const participantSet = new Set(currentParticipantIds.map(String));

  useEffect(() => {
    if (isOpen) {
      setEmailInput('');
      setSelectedProfiles(new Set());
      setProfilesByEmail(new Map());
      setError(null);
      setSubmissionError(null);
    }
  }, [isOpen]);

  // When the input changes, resolve any typed emails against profiles (client-side dedup first).
  // We keep a small in-memory map of email -> profile so the UI can show matched people immediately.
  useEffect(() => {
    const trimmed = emailInput.trim();
    if (!trimmed) {
      setProfilesByEmail(new Map());
      return;
    }

    const emails = Array.from(
      new Set(
        trimmed
          .split(/[,\n]+/)
          .map(normalizeEmail)
          .filter((e) => e && EMAIL_RE.test(e))
      )
    );
    if (emails.length === 0) {
      setProfilesByEmail(new Map());
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
          .in('email', emails)
          .limit(50);
        if (e) throw e;

        const map = new Map<string, User>();
        for (const u of Array.isArray(data) ? data : []) {
          const email = String(u.email || '').toLowerCase();
          if (!email) continue;
          map.set(email, {
            ...u,
            id: String(u.id),
            avatar: getAvatarUrl(u.avatar),
          } as User);
        }
        setProfilesByEmail(map);
      } catch (err: any) {
        setError(err?.message || 'Failed to look up emails');
      } finally {
        setLoading(false);
      }
    };

    const t = setTimeout(search, 180);
    return () => clearTimeout(t);
  }, [emailInput, currentUserId]);

  const entries = useMemo(
    () => parseEmailsInput(emailInput, participantSet, profilesByEmail),
    [emailInput, participantSet, profilesByEmail]
  );

  const matchedEntries = entries.filter((e) => e.status === 'matched');
  const matchedIds = new Set(matchedEntries.map((e) => String(e.profile!.id)));

  // Only let people select matched profiles that aren't already in the group.
  const effectiveSelected = new Set([
    ...Array.from(selectedProfiles).filter((id) => participantSet.has(id) || matchedIds.has(id)),
  ]);
  // Sync selectedProfiles to the effective set so the UI doesn't hold stale selections.
  useEffect(() => {
    setSelectedProfiles(effectiveSelected);
  }, [effectiveSelected]);

  const toggleProfile = (id: string) => {
    if (participantSet.has(id)) return;
    setSelectedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const invalidCount = entries.filter((e) => e.status === 'invalid').length;
  const unknownCount = entries.filter((e) => e.status === 'unknown').length;
  const alreadyInGroupCount = entries.filter((e) => e.status === 'already-in-group').length;
  const addableCount = matchedEntries.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);
    if (selectedProfiles.size === 0) {
      setSubmissionError('Add at least one person by email');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const toInsert = Array.from(selectedProfiles).map((user_id) => ({
        room_id: roomId,
        user_id,
      }));
      const { error: insertError } = await supabase.from('room_participants').insert(toInsert);
      if (insertError) throw insertError;
      onAdded();
      onClose();
    } catch (err: any) {
      setSubmissionError(err?.message || 'Failed to add members');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const canSubmit = selectedProfiles.size > 0 && !submitting;

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
              <AtSign className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="email"
                inputMode="email"
                placeholder="you@example.com, teammate@company.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
            {submissionError && (
              <p className="text-xs text-red-500 dark:text-red-400">{submissionError}</p>
            )}

            {entries.length > 0 && (
              <ul className="max-h-52 overflow-y-auto rounded-md border border-gray-200 dark:border-[#333333] divide-y divide-gray-200 dark:divide-[#333333]">
                {entries.map((entry) => {
                  const isSelected =
                    entry.status === 'matched' &&
                    selectedProfiles.has(String(entry.profile!.id));
                  return (
                    <li key={entry.email} className="">
                      <div className="flex items-start gap-2 p-2">
                        <div className="mt-0.5">
                          {entry.status === 'matched' && (
                            <button
                              type="button"
                              onClick={() => toggleProfile(String(entry.profile!.id))}
                              className={`flex items-center justify-center rounded-full p-0.5 transition-colors ${
                                isSelected
                                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30'
                                  : 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d]'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <span className="h-4 w-4 flex items-center justify-center">
                                  <span className="inline-block w-2 h-2 rounded-full bg-current opacity-40" />
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {entry.profile && (
                              entry.profile.avatar ? (
                                <img
                                  src={entry.profile.avatar}
                                  alt=""
                                  className="h-6 w-6 rounded-full object-cover flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30"
                                />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                    {(entry.profile.username || entry.email || '?').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )
                            )}
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {entry.profile?.username || entry.email}
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{entry.email}</span>
                            {entry.status === 'matched' && (
                              <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
                                <AtSign className="h-3 w-3" />
                                Add
                              </span>
                            )}
                            {entry.status === 'already-in-group' && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Check className="h-3 w-3" />
                                Already in group
                              </span>
                            )}
                            {entry.status === 'unknown' && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                <AlertCircle className="h-3 w-3" />
                                Not found in this workspace
                              </span>
                            )}
                            {entry.status === 'invalid' && (
                              <span className="inline-flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
                                <AlertCircle className="h-3 w-3" />
                                Invalid email
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {!emailInput.trim() && (
              <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                <AtSign className="mx-auto h-7 w-7 mb-1.5 opacity-50" />
                <p>Enter email addresses to add people</p>
                <p className="mt-0.5 text-gray-400 dark:text-gray-500">
                  Separate multiple emails with commas or line breaks
                </p>
              </div>
            )}

            {entries.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {addableCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5">
                    <Check className="h-3 w-3" />
                    {addableCount} can be added
                  </span>
                )}
                {alreadyInGroupCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#252525] px-2 py-0.5">
                    <Check className="h-3 w-3" />
                    {alreadyInGroupCount} already in group
                  </span>
                )}
                {unknownCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-0.5">
                    <AlertCircle className="h-3 w-3" />
                    {unknownCount} not found
                  </span>
                )}
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-0.5">
                    <AlertCircle className="h-3 w-3" />
                    {invalidCount} invalid
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-200 dark:border-[#333333] flex justify-between items-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedProfiles.size > 0
                ? `${selectedProfiles.size} selected`
                : 'No one selected'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adding...' : 'Add members'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMembersToGroupModal;
