// frontend/src/components/NoteForm.tsx
import React from 'react';
import { Save, X } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

interface NoteFormProps {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing?: boolean;
  isLoading?: boolean;
}

const NoteForm: React.FC<NoteFormProps> = ({
  title,
  content,
  onTitleChange,
  onContentChange,
  onSave,
  onCancel,
  isEditing = false,
  isLoading = false
}) => {
  return (
    <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Note title"
        className="w-full mb-3 p-3 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
      />
      
      <RichTextEditor
        content={content}
        onChange={onContentChange}
        minHeight={isEditing ? '150px' : '200px'}
        placeholder="Write your note content here..."
      />
      
      <div className="flex gap-2 mt-3">
        <button
          onClick={onSave}
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center"
        >
          <Save size={16} className="mr-1 text-white" />
          {isLoading ? 'Saving...' : 'Save Note'}
        </button>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 flex items-center"
        >
          <X size={16} className="mr-1 text-white" />
          Cancel
        </button>
      </div>
    </div>
  );
};

export default NoteForm;