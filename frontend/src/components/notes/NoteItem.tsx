// frontend/src/components/NoteItem.tsx
import React from 'react';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import EditTitleModal from './EditTitleModal';
import axios from 'axios';

interface Note {
  id: number;
  title: string;
  content: string;
  category: number;
  category_name: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

interface NoteItemProps {
  note: Note;
  onEdit: (note: Note) => void;
  onEditTitle: (note: Note) => void;
  onDelete: (noteId: number) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({ note, onEdit, onEditTitle, onDelete }) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api/notes';

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

  const handleNoteClick = async () => {
    try {
      // Update last_visited timestamp
      const response = await axios.patch(`${API_URL}/notes/${note.id}/`, {
        last_visited: new Date().toISOString()
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
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
      <div className="group border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer relative" onClick={handleNoteClick}>
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
              {note.title}
            </h3>
          </div>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
              className="p-2 text-gray-500 hover:text-gray-700"
              title="More"
            >
              <MoreVertical size={16} className="text-white" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditTitle(); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit size={14} className="inline mr-2" /> Edit Title
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); if (window.confirm(`Delete note "${note.title}"?`)) { onDelete(note.id); } }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Trash2 size={14} className="inline mr-2 text-red-600" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <EditTitleModal
        isOpen={showEditModal}
        currentTitle={note.title}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveTitle}
      />
    </>
  );
};

export default NoteItem;