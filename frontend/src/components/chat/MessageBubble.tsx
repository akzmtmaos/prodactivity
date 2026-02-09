import React, { useState, useEffect } from 'react';
import MessageAvatar from './MessageAvatar';
import { Message, ChatRoom, User } from './types';
import { getAvatarUrl } from './utils';
import { File, Download, X, FileText, BookOpen, ClipboardList, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MessageBubbleProps {
  message: Message;
  prevMessage: Message | null;
  currentUserId: string;
  selectedRoom: ChatRoom | null;
  showAvatar: boolean;
  showDateSeparator: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  prevMessage,
  currentUserId,
  selectedRoom,
  showAvatar,
  showDateSeparator,
}) => {
  const navigate = useNavigate();
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [imageGallery, setImageGallery] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isOwnMessage = String(message.sender_id) === currentUserId;

  // Parse shared item from message content
  const parseSharedItem = (content: string) => {
    const sharedMatch = content.match(/__SHARED_ITEM__(.+)$/);
    if (sharedMatch && sharedMatch[1]) {
      try {
        return JSON.parse(sharedMatch[1]);
      } catch (e) {
        console.error('Error parsing shared item:', e);
        return null;
      }
    }
    return null;
  };

  const sharedItem = parseSharedItem(message.content || '');
  const displayContent = sharedItem ? message.content.replace(/__SHARED_ITEM__.+$/, '').trim() : message.content;

  // Get all images from attachments
  const imageAttachments = message.attachments?.filter(att => att.type === 'image') || [];
  const fileAttachments = message.attachments?.filter(att => att.type === 'file') || [];

  // Hide navbar and prevent scrolling when image modal is open
  useEffect(() => {
    if (expandedImage) {
      document.documentElement.classList.add('image-modal-active');
      document.body.classList.add('image-modal-active');
    } else {
      document.documentElement.classList.remove('image-modal-active');
      document.body.classList.remove('image-modal-active');
    }

    return () => {
      document.documentElement.classList.remove('image-modal-active');
      document.body.classList.remove('image-modal-active');
    };
  }, [expandedImage]);

  // Set image gallery when opening modal
  const handleImageClick = (url: string) => {
    const imageUrls = imageAttachments.map(att => att.url);
    const index = imageUrls.indexOf(url);
    setImageGallery(imageUrls);
    setCurrentImageIndex(index >= 0 ? index : 0);
    setExpandedImage(url);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageGallery.length > 0) {
      const nextIndex = (currentImageIndex + 1) % imageGallery.length;
      setCurrentImageIndex(nextIndex);
      setExpandedImage(imageGallery[nextIndex]);
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageGallery.length > 0) {
      const prevIndex = (currentImageIndex - 1 + imageGallery.length) % imageGallery.length;
      setCurrentImageIndex(prevIndex);
      setExpandedImage(imageGallery[prevIndex]);
    }
  };
  const messageDate = new Date(message.created_at);

  // Get avatar - prioritize sender, then participant, ensure URL is processed
  const senderId = String(message.sender_id);
  const participant = selectedRoom?.participants?.find(p => String(p.id) === senderId);
  let avatarToUse = message.sender?.avatar;
  if (!avatarToUse && participant?.avatar) {
    avatarToUse = getAvatarUrl(participant.avatar);
  } else if (avatarToUse) {
    avatarToUse = getAvatarUrl(avatarToUse);
  }
  const usernameToUse = message.sender?.username || participant?.username;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      {showDateSeparator && (
        <div className="flex justify-center my-4">
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
            {messageDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      )}
      <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
        {showAvatar && !isOwnMessage && (
          <MessageAvatar 
            avatar={avatarToUse}
            username={usernameToUse}
          />
        )}
        {!showAvatar && !isOwnMessage && <div className="w-8 h-8 flex-shrink-0" />}
        <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {showAvatar && !isOwnMessage && usernameToUse && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {usernameToUse}
            </span>
          )}
          {/* Shared Item Card */}
          {sharedItem && (
            <div className={`rounded-lg border-2 ${
              isOwnMessage
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            } p-4 max-w-sm`}>
              <div className="flex items-start gap-3">
                {sharedItem.itemType === 'note' || sharedItem.itemType === 'notebook' ? (
                  <FileText className={`flex-shrink-0 ${isOwnMessage ? 'text-indigo-600' : 'text-gray-600 dark:text-gray-400'}`} size={24} />
                ) : sharedItem.itemType === 'reviewer' ? (
                  <BookOpen className={`flex-shrink-0 ${isOwnMessage ? 'text-indigo-600' : 'text-gray-600 dark:text-gray-400'}`} size={24} />
                ) : sharedItem.itemType === 'task' ? (
                  <CheckSquare className={`flex-shrink-0 ${isOwnMessage ? 'text-indigo-600' : 'text-gray-600 dark:text-gray-400'}`} size={24} />
                ) : (
                  <ClipboardList className={`flex-shrink-0 ${isOwnMessage ? 'text-indigo-600' : 'text-gray-600 dark:text-gray-400'}`} size={24} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold mb-1 ${
                    isOwnMessage ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Shared {sharedItem.itemType}
                  </p>
                  <p className={`text-sm font-medium mb-2 truncate ${
                    isOwnMessage ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-white'
                  }`}>
                    {sharedItem.itemTitle}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      isOwnMessage
                        ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {sharedItem.permissionLevel}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          if (sharedItem.itemType === 'note') {
                            // Fetch note to get notebook ID using axiosInstance (which has auth configured)
                            const axiosInstance = (await import('../../utils/axiosConfig')).default;
                            
                            try {
                              const response = await axiosInstance.get(`/notes/${sharedItem.itemId}/`);
                              const note = response.data;
                              
                              console.log('✅ Note fetched for navigation:', { 
                                noteId: note.id, 
                                notebookId: note.notebook,
                                title: note.title 
                              });
                              
                              // Navigate to note using the correct route format: /notes/notebooks/:notebookId/notes/:noteId
                              const targetUrl = `/notes/notebooks/${note.notebook}/notes/${note.id}`;
                              console.log('🔗 Navigating to:', targetUrl);
                              navigate(targetUrl, { replace: false });
                              
                              // Wait for navigation to complete, then trigger custom event to open the note
                              // Use a shorter delay since we're handling this in URL navigation now
                              setTimeout(() => {
                                console.log('📨 Dispatching openSharedNote event:', { noteId: note.id, notebookId: note.notebook });
                                window.dispatchEvent(new CustomEvent('openSharedNote', { 
                                  detail: { noteId: note.id, notebookId: note.notebook } 
                                }));
                              }, 300);
                            } catch (error: any) {
                              console.error('❌ Failed to fetch note:', error.response?.status, error.response?.statusText || error.message);
                              // Only navigate away if it's a real error
                              if (error.response?.status === 404 || error.response?.status === 403) {
                                console.warn('⚠️ Note not accessible, redirecting to /notes');
                                navigate('/notes');
                              } else if (error.response?.status === 401) {
                                console.error('🔐 Authentication failed, check token');
                                // Don't navigate away on auth error, let user see the error
                              }
                            }
                          } else if (sharedItem.itemType === 'notebook') {
                            // Navigate to notebook view
                            navigate(`/notes/notebooks/${sharedItem.itemId}`);
                          } else if (sharedItem.itemType === 'reviewer') {
                            navigate(`/reviewer/${sharedItem.itemId}`);
                          } else if (sharedItem.itemType === 'task') {
                            navigate('/tasks');
                          }
                        } catch (error) {
                          console.error('Error loading shared item:', error);
                          // Fallback navigation
                          if (sharedItem.itemType === 'note' || sharedItem.itemType === 'notebook') {
                            navigate('/notes');
                          } else if (sharedItem.itemType === 'reviewer') {
                            navigate('/reviewer');
                          } else if (sharedItem.itemType === 'task') {
                            navigate('/tasks');
                          }
                        }
                      }}
                      className={`text-xs font-medium ${
                        isOwnMessage
                          ? 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700'
                          : 'text-blue-600 dark:text-blue-400 hover:text-blue-700'
                      } hover:underline`}
                    >
                      View →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Text Content with Background Bubble */}
          {displayContent && (
            <div
              className={`px-4 py-2 rounded-2xl ${
                isOwnMessage
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              } ${sharedItem ? 'mt-2' : ''}`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>
            </div>
          )}

          {/* Attachments without Background Container */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`${message.content ? 'mt-2' : ''}`}>
                {/* Image Gallery - Messenger Style */}
                {imageAttachments.length > 0 && (
                  <div className={`rounded-lg overflow-hidden ${
                    imageAttachments.length === 1 
                      ? 'max-w-sm' 
                      : imageAttachments.length === 2
                      ? 'grid grid-cols-2 gap-1 max-w-md'
                      : imageAttachments.length === 3
                      ? 'grid grid-cols-2 gap-1 max-w-md'
                      : 'grid grid-cols-2 gap-1 max-w-md'
                  }`}>
                    {imageAttachments.slice(0, 4).map((att, index) => {
                      const totalImages = imageAttachments.length;
                      const isLastVisible = index === 3 && totalImages > 4;
                      
                      return (
                        <div
                          key={index}
                          className={`relative group cursor-pointer hover:opacity-90 transition-opacity ${
                            totalImages === 1
                              ? 'w-full'
                              : totalImages === 3 && index === 2
                              ? 'col-span-2'
                              : 'aspect-square'
                          }`}
                          onClick={() => handleImageClick(att.url)}
                        >
                          <img
                            src={att.url}
                            alt={att.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {isLastVisible && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                              <span className="text-white font-bold text-xl">
                                +{totalImages - 4}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* File Attachments */}
                {fileAttachments.length > 0 && (
                  <div className={`space-y-2 ${imageAttachments.length > 0 ? 'mt-2' : ''}`}>
                    {fileAttachments.map((att, index) => (
                      <a
                        key={index}
                        href={att.url}
                        download={att.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <File size={24} className="text-gray-600 dark:text-gray-300" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-gray-900 dark:text-white">
                            {att.name}
                          </p>
                          {att.size && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatFileSize(att.size)}
                            </p>
                          )}
                        </div>
                        <Download size={18} className="text-gray-500 dark:text-gray-400" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {messageDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            {isOwnMessage && message.status && (
              <span className={`text-xs ${
                message.status === 'sending' 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : message.status === 'failed'
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {message.status === 'sending' ? 'Sending...' : message.status === 'failed' ? 'Failed' : 'Sent'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Image Modal - Messenger Style with Navigation */}
      {expandedImage && imageGallery.length > 0 && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] bg-black/40 dark:bg-black/60 flex items-center justify-center"
          onClick={() => {
            setExpandedImage(null);
            setImageGallery([]);
            setCurrentImageIndex(0);
          }}
          style={{ margin: 0, padding: 0 }}
        >
          {/* Close Button */}
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 p-3 rounded-full hover:bg-white/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedImage(null);
              setImageGallery([]);
              setCurrentImageIndex(0);
            }}
          >
            <X size={32} />
          </button>

          {/* Previous Button */}
          {imageGallery.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 p-3 rounded-full hover:bg-white/10 transition-colors"
              onClick={handlePrevImage}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}

          {/* Next Button */}
          {imageGallery.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 p-3 rounded-full hover:bg-white/10 transition-colors"
              onClick={handleNextImage}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          )}

          {/* Image Counter */}
          {imageGallery.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full text-sm z-10">
              {currentImageIndex + 1} / {imageGallery.length}
            </div>
          )}

          {/* Image */}
          <img
            src={expandedImage}
            alt={`Image ${currentImageIndex + 1} of ${imageGallery.length}`}
            className="max-w-full max-h-full object-contain p-4"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default MessageBubble;

