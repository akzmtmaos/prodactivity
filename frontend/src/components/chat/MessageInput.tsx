import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, File } from 'lucide-react';
import { Attachment } from './types';

interface MessageInputProps {
  newMessage: string;
  isSendingMessage: boolean;
  onMessageChange: (message: string) => void;
  onSubmit: (e: React.FormEvent, attachments?: Attachment[]) => void;
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
}) => {
  const [attachments, setAttachments] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-resize textarea: single-line height (32px) when empty, grow up to 96px when typing
  const LINE_HEIGHT_PX = 32;
  const MAX_HEIGHT_PX = 96;
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const h = !newMessage.trim()
        ? LINE_HEIGHT_PX
        : Math.min(textarea.scrollHeight, MAX_HEIGHT_PX);
      textarea.style.height = `${h}px`;
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
      attachments: attachmentData.map(a => ({ name: a.name, type: a.type, url: a.url?.substring(0, 50) }))
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
        <div className="flex gap-1 items-center">
          {/* File Input (hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Attachment Button - h-8 for a bit more presence */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSendingMessage}
            className="h-8 w-8 flex-shrink-0 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach file or image"
          >
            <Paperclip size={18} />
          </button>

          {/* Text Input - h-8 min height, equal padding */}
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder={isDragging ? "Drop files here..." : "Type a message..."}
            disabled={isSendingMessage}
            rows={1}
            className="flex-1 min-h-[32px] min-w-0 px-2 py-2 text-xs leading-4 border border-gray-200 dark:border-[#333333] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white dark:bg-[#252525] text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed resize-none max-h-24 overflow-y-auto scrollbar-hide box-border"
            style={{ height: '32px' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          {/* Send Button - h-8 to match field and attach */}
          <button
            type="submit"
            disabled={(!newMessage.trim() && attachments.length === 0) || isSendingMessage}
            className="h-8 px-3 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;

