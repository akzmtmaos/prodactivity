// frontend/src/components/NoteItem.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import { Edit, Trash2, MoreVertical, Archive, RotateCcw, AlertTriangle, Share2 } from 'lucide-react';
import EditTitleModal from './EditTitleModal';
import ShareModal from '../collaboration/ShareModal';
import axiosInstance from '../../utils/axiosConfig';
import axios from 'axios';

interface Note {
  id: number;
  title: string;
  content: string;
  notebook: number;
  notebook_name: string;
  notebook_type: string;
  notebook_urgency: string;
  notebook_color: string;
  note_type: 'lecture' | 'reading' | 'assignment' | 'exam' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_urgent: boolean;
  tags: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  is_archived: boolean;
  archived_at: string | null;
}

interface NoteItemProps {
  note: Note;
  onEdit: (note: Note) => void;
  onEditTitle: (note: Note) => void;
  onDelete: (noteId: number) => void;
  onArchive: () => void;
  onToggleImportant: (noteId: number) => void;
  deletingNoteId?: number | null;
}

const NoteItem: React.FC<NoteItemProps> = ({ note, onEdit, onEditTitle, onDelete, onArchive, onToggleImportant: _onToggleImportant, deletingNoteId }) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const portalMenuRef = React.useRef<HTMLDivElement>(null);

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEditTitle = () => {
    setShowMenu(false);
    setShowEditModal(true);
  };

  const handleSaveTitle = (newTitle: string) => {
    onEditTitle({ ...note, title: newTitle });
    setShowEditModal(false);
  };

  const handleArchive = () => {
    setShowMenu(false);
    onArchive();
  };

  // Close menu on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        portalMenuRef.current && !portalMenuRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      // Use a small delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Helper function to get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'URGENT';
      case 'high':
        return 'HIGH';
      case 'medium':
        return 'MED';
      case 'low':
        return 'LOW';
      default:
        return 'MED';
    }
  };

  const getNoteTypeLabel = (noteType: string) => {
    switch (noteType) {
      case 'lecture':
        return 'Lecture';
      case 'reading':
        return 'Reading';
      case 'assignment':
        return 'Assignment';
      case 'exam':
        return 'Exam';
      case 'meeting':
        return 'Meeting';
      case 'personal':
        return 'Personal';
      case 'work':
        return 'Work';
      case 'project':
        return 'Project';
      case 'research':
        return 'Research';
      default:
        return 'Other';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'urgent':
        return 'bg-orange-500 text-white';
      case 'important':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const handleNoteClick = async () => {
    // If note is archived, don't allow editing - just show a message
    if (note.is_archived) {
      // Still update last_visited timestamp but don't open editor
      try {
        await axiosInstance.patch(`/notes/${note.id}/`, {
          last_visited: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to update note visit timestamp:', error);
      }
      return; // Don't open editor for archived notes
    }
    
    try {
      // Update last_visited timestamp
      const response = await axiosInstance.patch(`/notes/${note.id}/`, {
        last_visited: new Date().toISOString()
      });
      
      console.log('Visit update response:', response.data);
      
      // Dispatch event to notify that a note has been updated
      window.dispatchEvent(new Event('noteUpdated'));
      
      // Call the original onEdit handler
      onEdit(note);
    } catch (error) {
      console.error('Failed to update note visit timestamp:', error);
      if (axios.isAxiosError(error)) {
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      // Still call onEdit even if the visit update fails
      onEdit(note);
    }
  };

  return (
    <>
      <div
        className={`group border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer relative flex items-stretch min-h-[60px] ${deletingNoteId === note.id ? 'animate-fadeOut' : ''}`}
        onClick={handleNoteClick}
      >
        {/* Vertical colored bar matching the notebook color */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2.5 min-w-[12px] rounded-l-md"
          style={{
            backgroundColor: note.notebook_color || `hsl(${(note.notebook * 137.5) % 360}, 70%, 85%)`,
          }}
        />
        <div className="flex-1 flex flex-col justify-center ml-4">
          {/* First line: Note Title */}
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
              {note.title}
            </h3>
          </div>
          {/* Second line: Only timestamps */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Created: {formatDate(note.created_at)} | Updated: {formatDate(note.updated_at)}
            </span>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            ref={buttonRef}
            onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="More"
          >
            <MoreVertical size={16} className="text-gray-500 dark:text-gray-300" />
          </button>
          {showMenu && ReactDOM.createPortal(
            <div 
              ref={portalMenuRef}
              className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-[9999]"
              style={{
                top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
                right: buttonRef.current ? window.innerWidth - buttonRef.current.getBoundingClientRect().right + window.scrollX : 0,
                width: '128px'
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {!note.is_archived && (
                <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditTitle(); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit size={14} className="inline mr-2" /> Edit Title
                </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowShareModal(true); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Share2 size={14} className="inline mr-2" /> Share
                  </button>
                </>
              )}
              {note.is_archived ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleArchive(); }}
                  className="block w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <RotateCcw size={14} className="inline mr-2" /> Unarchive
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); handleArchive(); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Archive size={14} className="inline mr-2" /> Archive
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(note.id); }}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Trash2 size={14} className="inline mr-2 text-red-600" /> Delete
              </button>
            </div>,
            document.body
          )}
        </div>
      </div>
      <EditTitleModal
        isOpen={showEditModal}
        currentTitle={note.title}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveTitle}
      />
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        itemType="note"
        itemId={note.id}
        itemTitle={note.title}
      />
    </>
  );
};

export default NoteItem;