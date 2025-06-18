import React, { useState } from 'react';
import { X, Plus, Edit, Trash2, Save } from 'lucide-react';

interface SubDeck {
  id: string;
  title: string;
  description: string;
  parentDeckId: string;
  created_at: string;
  updated_at: string;
}

interface SubDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckTitle: string;
  subDecks: SubDeck[];
  onAddSubDeck: (subDeck: Omit<SubDeck, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateSubDeck: (id: string, subDeck: Omit<SubDeck, 'id' | 'created_at' | 'updated_at'>) => void;
  onDeleteSubDeck: (id: string) => void;
}

const SubDeckModal: React.FC<SubDeckModalProps> = ({
  isOpen,
  onClose,
  deckTitle,
  subDecks,
  onAddSubDeck,
  onUpdateSubDeck,
  onDeleteSubDeck
}) => {
  const [editingSubDeck, setEditingSubDeck] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubDeck, setNewSubDeck] = useState({ title: '', description: '' });
  const [editForm, setEditForm] = useState({ title: '', description: '' });

  const handleAddSubDeck = () => {
    if (newSubDeck.title.trim()) {
      onAddSubDeck({
        title: newSubDeck.title.trim(),
        description: newSubDeck.description.trim(),
        parentDeckId: ''
      });
      setNewSubDeck({ title: '', description: '' });
      setShowAddForm(false);
    }
  };

  const handleEditSubDeck = (subDeck: SubDeck) => {
    setEditingSubDeck(subDeck.id);
    setEditForm({
      title: subDeck.title,
      description: subDeck.description
    });
  };

  const handleSaveEdit = () => {
    if (editingSubDeck && editForm.title.trim()) {
      onUpdateSubDeck(editingSubDeck, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        parentDeckId: ''
      });
      setEditingSubDeck(null);
      setEditForm({ title: '', description: '' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Manage Subdecks
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {deckTitle} • {subDecks.length} subdecks
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Add New SubDeck Button */}
          <div className="mb-6">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center"
              >
                <Plus size={20} className="mr-2" />
                Add New SubDeck
              </button>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Add New SubDeck
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newSubDeck.title}
                      onChange={(e) => setNewSubDeck({ ...newSubDeck, title: e.target.value })}
                      placeholder="Enter subdeck title..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newSubDeck.description}
                      onChange={(e) => setNewSubDeck({ ...newSubDeck, description: e.target.value })}
                      placeholder="Enter subdeck description..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewSubDeck({ title: '', description: '' });
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSubDeck}
                      disabled={!newSubDeck.title.trim()}
                      className={`px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium flex items-center transition-colors ${
                        !newSubDeck.title.trim()
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-indigo-700'
                      }`}
                    >
                      <Plus size={16} className="mr-2" />
                      Add SubDeck
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SubDecks List */}
          <div className="space-y-4">
            {subDecks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  No subdecks yet. Add your first subdeck to get started!
                </p>
              </div>
            ) : (
              subDecks.map((subDeck) => (
                <div
                  key={subDeck.id}
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                >
                  {editingSubDeck === subDeck.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Description
                        </label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setEditingSubDeck(null)}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editForm.title.trim()}
                          className={`px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center transition-colors ${
                            !editForm.title.trim()
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-indigo-700'
                          }`}
                        >
                          <Save size={14} className="mr-1" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {subDeck.title}
                          </h3>
                          {subDeck.description && (
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                              {subDeck.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleEditSubDeck(subDeck)}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Edit subdeck"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => onDeleteSubDeck(subDeck.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete subdeck"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubDeckModal; 