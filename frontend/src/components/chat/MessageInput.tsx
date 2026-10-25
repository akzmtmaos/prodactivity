import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Plus, X, File } from 'lucide-react';
import { Attachment, User as ChatUser } from './types';

interface MessageInputProps {
  newMessage: string;
  isSendingMessage: boolean;
  onMessageChange: (message: string) => void;
  onSubmit: (e: React.FormEvent, attachments?: Attachment[]) => void;
  participants?: ChatUser[];
  currentUserId?: string;
}

interface FilePreview {
  file: File;
  preview?: string;
  id: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  newMessage,
  isSendingMessage,
  onMessageChange,
  onSubmit,
  participants = [],
  currentUserId,
}) => {
  const [attachments, setAttachments] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Members come from selectedRoom.participants (passed by Chat.tsx).
  // Mention picker filtering uses that list + currentUserId so you can't pick yourself.
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(-1);
  const [activeMention, setActiveMention] = useState<{ start: number; end: number } | null>(null);

  // Handle paste events for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleFileAdd(file);
          }
        }
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('paste', handlePaste);
      return () => {
        textarea.removeEventListener('paste', handlePaste);
      };
    }
  }, []);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value, selectionStart } = e.currentTarget;
    onMessageChange(value);

    const mentionStart = value.lastIndexOf('@', selectionStart - 1);
    if (mentionStart < 0) {
      setActiveMention(null);
      setMentionSearch(null);
      return;
    }

    let mentionEnd = mentionStart + 1;
    while (mentionEnd < value.length && !/\s/.test(value[mentionEnd]) && value[mentionEnd] !== '@') {
      mentionEnd += 1;
    }

    if (selectionStart > mentionEnd) {
      setActiveMention(null);
      setMentionSearch(null);
      return;
    }

    setActiveMention({ start: mentionStart, end: mentionEnd });
    setMentionSearch(value.slice(mentionStart + 1, selectionStart));
    setMentionSelectedIndex(-1);
  };

  // Composer height is pinned at 32px so the input line never jumps when the mention popup opens.
  const LINE_HEIGHT_PX = 40;
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${LINE_HEIGHT_PX}px`;
    }
  }, [newMessage]);

  // Clean up preview URLs
  useEffect(() => {
    return () => {
      attachments.forEach(att => {
        if (att.preview) {
          URL.revokeObjectURL(att.preview);
        }
      });
    };
  }, [attachments]);

  const handleFileAdd = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }

    const id = `file-${Date.now()}-${Math.random()}`;
    const isImage = file.type.startsWith('image/');
    const preview: FilePreview = {
      file,
      id,
      preview: isImage ? URL.createObjectURL(file) : undefined,
    };

    setAttachments(prev => [...prev, preview]);
  };

  const filteredMembers = useMemo(() => {
    if (mentionSearch === null) return [];
    const q = mentionSearch.trim().toLowerCase();
    if (!q) return participants.filter((p) => String(p.id) !== String(currentUserId ?? ''));
    return participants.filter(
      (p) =>
        p.username &&
        p.username.toLowerCase().includes(q) &&
        String(p.id) !== String(currentUserId ?? ''),
    );
  }, [participants, mentionSearch, currentUserId]);

  const insertMention = (mention: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !activeMention) return;

    const before = textarea.value.slice(0, activeMention.start);
    const after = textarea.value.slice(activeMention.end);
    const insertedText = `${mention} `;
    const nextValue = before + insertedText + after;
    onMessageChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = before.length + insertedText.length;
      textarea.setSelectionRange(cursor, cursor);
    });
    setMentionSearch(null);
    setMentionSelectedIndex(-1);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionSearch === null || e.nativeEvent.isComposing) return false;

    if (e.key === 'ArrowDown') {
      if (filteredMembers.length > 0) {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        ));
        return true;
      }
    } else if (e.key === 'ArrowUp') {
      if (filteredMembers.length > 0) {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        ));
        return true;
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (mentionSearch.trim() === '') {
        insertMention('@everyone');
      } else if (filteredMembers.length > 0) {
        const idx = mentionSelectedIndex >= 0 ? mentionSelectedIndex : 0;
        const member = filteredMembers[idx];
        if (member) {
          insertMention(`@${member.username}`);
        }
      }
      return true;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMentionSearch(null);
      setMentionSelectedIndex(-1);
      return true;
    }
    return false;
  };

  const selectMember = (member: ChatUser) => {
    insertMention(`@${member.username}`);
  };

  const selectEveryone = () => {
    insertMention('@everyone');
  };

  const mentionPopupVisible = mentionSearch !== null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => handleFileAdd(file));
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const toRemove = prev.find(a => a.id === id);
      if (toRemove?.preview) {
        URL.revokeObjectURL(toRemove.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files) {
      Array.from(files).forEach(file => handleFileAdd(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachments.length === 0) || isSendingMessage) return;

    console.log('📎 MessageInput: Preparing to send attachments:', { count: attachments.length, attachments: attachments.map(a => a.file.name) });

    const attachmentData: Attachment[] = attachments.map(att => ({
      url: att.preview || URL.createObjectURL(att.file),
      type: att.file.type.startsWith('image/') ? 'image' : 'file',
      name: att.file.name,
      size: att.file.size,
      mime_type: att.file.type,
    }));

    console.log('📎 MessageInput: Sending attachment data:', {
      count: attachmentData.length,
      attachments: attachmentData.map(a => ({ name: a.name, type: a.type, url: a.url?.substring(0, 50) })),
    });

    onSubmit(e, attachmentData);
    setAttachments([]);
  };

  return (
    <div
      className={`border-t border-gray-200 dark:border-gray-700 ${
        isDragging ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
      } transition-colors`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="px-4 pt-4 pb-2 flex flex-wrap gap-2">
          {attachments.map(att => (
            <div
              key={att.id}
              className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
            >
              {att.preview ? (
                <div className="relative">
                  <img
                    src={att.preview}
                    alt={att.file.name}
                    className="h-20 w-20 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-20 bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center p-2">
                  <File size={24} className="text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center">
                    {att.file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-2 py-2">
        <div className="relative">
          {/* File Input (hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="relative rounded-xl border border-gray-200 bg-white transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 dark:border-[#333333] dark:bg-[#252525]">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleMessageChange}
              placeholder={isDragging ? "Drop files here..." : "Type a message..."}
              disabled={isSendingMessage}
              rows={1}
              className="w-full min-h-[40px] min-w-0 pt-3 pb-1 pl-11 pr-12 text-sm leading-6 focus:outline-none bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none max-h-24 overflow-y-auto scrollbar-hide box-border"
              style={{ height: '40px' }}
              onKeyDown={(e) => {
                if (handleTextareaKeyDown(e)) return;
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSendingMessage}
              className="absolute left-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-[#333333] dark:hover:text-indigo-400"
              title="Attach file or image"
              aria-label="Attach file or image"
            >
              <Plus size={20} />
            </button>
            {mentionPopupVisible && (
              <div className="absolute bottom-full left-0 z-50 mb-2 w-full max-w-[280px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-[#333333] dark:bg-[#252525] max-h-56">
              <div className="max-w-[280px] mx-auto">
                {mentionSearch !== null && mentionSearch.trim() === '' && (
                  <button
                    type="button"
                    onClick={selectEveryone}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
                  >
                    <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-600 dark:bg-[#333333] dark:text-gray-300">
                      @
                    </span>
                    @everyone
                  </button>
                )}

                {filteredMembers.length > 0 ? (
                  <ul className="text-sm">
                    {filteredMembers.map((member, index) => (
                      <li key={String(member.id)}>
                        <button
                          type="button"
                          onClick={() => selectMember(member)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] ${index === mentionSelectedIndex ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                        >
                          <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                              {(member.username || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="flex-1 truncate">{member.username}</span>
                          <span className="text-indigo-600 dark:text-indigo-400 text-xs font-medium">@</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : mentionSearch.trim() !== '' ? (
                  <div className="px-3 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                    No members found for “@{mentionSearch}”
                  </div>
                ) : null}
                </div>
              </div>
            )}
              <button
                type="submit"
                disabled={(!newMessage.trim() && attachments.length === 0) || isSendingMessage}
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600"
                title="Send message"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </div>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
