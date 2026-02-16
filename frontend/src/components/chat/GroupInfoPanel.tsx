import React, { useState, useRef, useEffect } from 'react';
import { Users, UserPlus, Camera, Loader2, Check, UserMinus } from 'lucide-react';
import { ChatRoom } from './types';

interface GroupInfoPanelProps {
  room: ChatRoom;
  currentUserId: string;
  createdBy?: string | null;
  onUpdateRoom: (updates: { name?: string; avatar_url?: string | null }) => Promise<void>;
  onPhotoChange: (file: File) => Promise<string | null>;
  onAddMembers: () => void;
  onRemoveMember?: (userId: string) => Promise<void>;
}

const GroupInfoPanel: React.FC<GroupInfoPanelProps> = ({
  room,
  currentUserId,
  createdBy,
  onUpdateRoom,
  onPhotoChange,
  onAddMembers,
  onRemoveMember,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(room.name || '');
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = room.name || 'Group';
  const participants = room.participants || [];
  const isOwner = Boolean(createdBy && String(createdBy) === currentUserId);

  useEffect(() => {
    setNameValue(room.name || '');
  }, [room.name]);

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    if (trimmed === displayName || !trimmed) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await onUpdateRoom({ name: trimmed });
      setEditingName(false);
    } finally {
      setSavingName(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploadingPhoto(true);
    try {
      const url = await onPhotoChange(file);
      if (url) await onUpdateRoom({ avatar_url: url });
    } catch (err) {
      console.error('Error updating group photo:', err);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  return (
    <div className="w-72 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-[#1e1e1e]">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Group overview
        </h3>

        {/* Group photo */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border-2 border-gray-200 dark:border-[#333333]">
              {room.avatar_url ? (
                <img
                  src={room.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="text-indigo-600 dark:text-indigo-400" size={32} />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow hover:bg-indigo-700 transition-colors disabled:opacity-50"
              title="Change group photo"
            >
              {uploadingPhoto ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
          >
            {uploadingPhoto ? 'Uploading...' : 'Change photo'}
          </button>
        </div>

        {/* Group name - compact height to match search/filters (h-7, text-xs) */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Group name</label>
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') {
                    setNameValue(displayName);
                    setEditingName(false);
                  }
                }}
                className="flex-1 min-w-0 h-7 px-2.5 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Group name"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={savingName || !nameValue.trim() || nameValue.trim() === displayName}
                className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                title="Save"
                aria-label="Save group name"
              >
                {savingName ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} strokeWidth={2.5} />
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="w-full text-left h-7 px-2.5 text-xs font-medium text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors border border-transparent hover:border-gray-200 dark:hover:border-[#333333] flex items-center"
            >
              {displayName}
            </button>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Members ({participants.length})
          </span>
          <button
            type="button"
            onClick={onAddMembers}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <UserPlus size={12} />
            Add
          </button>
        </div>
        <ul className="space-y-0.5">
          {participants.map((p) => {
            const isYou = String(p.id) === currentUserId;
            const canRemove = isOwner && onRemoveMember && !isYou;
            const isRemoving = removingUserId === String(p.id);
            return (
              <li
                key={p.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2d2d2d] group"
              >
                {p.avatar ? (
                  <img
                    src={p.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                      {(p.username || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm text-gray-900 dark:text-white truncate flex-1 min-w-0">
                  {p.username}
                  {isYou && (
                    <span className="text-gray-500 dark:text-gray-400 ml-1">(you)</span>
                  )}
                </span>
                {canRemove && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const uid = String(p.id);
                      setRemovingUserId(uid);
                      try {
                        await onRemoveMember?.(uid);
                      } finally {
                        setRemovingUserId(null);
                      }
                    }}
                    disabled={isRemoving}
                    className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    title="Remove from group"
                    aria-label={`Remove ${p.username} from group`}
                  >
                    {isRemoving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <UserMinus size={16} />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default GroupInfoPanel;
