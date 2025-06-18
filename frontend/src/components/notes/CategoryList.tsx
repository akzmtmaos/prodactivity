// frontend/src/components/CategoryList.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Edit, Trash2, Folder, Save, X } from 'lucide-react';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';

interface Category {
  id: number; 
  name: string;
  created_at: string;
  updated_at: string;
  notes_count: number;
}

interface CategoryListProps {
  categories: Category[];
  selectedCategory: Category | null;
  isAddingCategory: boolean;
  editingCategory: Category | null;
  newCategoryName: string;
  onCategorySelect: (category: Category) => void;
  onAddCategory: () => void;
  onUpdateCategory: () => void;
  onDeleteCategory: (categoryId: number) => void;
  onStartAddingCategory: () => void;
  onCancelAddingCategory: () => void;
  onStartEditingCategory: (category: Category) => void;
  onCancelEditingCategory: () => void;
  onCategoryNameChange: (name: string) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  selectedCategory,
  isAddingCategory,
  editingCategory,
  newCategoryName,
  onCategorySelect,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onStartAddingCategory,
  onCancelAddingCategory,
  onStartEditingCategory,
  onCancelEditingCategory,
  onCategoryNameChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  useEffect(() => {
    if (editorRef.current && editingCategory) {
      editorRef.current.innerHTML = newCategoryName;
    }
  }, [editingCategory, newCategoryName]);

  const handleContentChange = () => {
    if (editorRef.current) {
      onCategoryNameChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="w-full lg:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow p-5 h-[calc(100vh-12rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Categories
        </h2>
        <button 
          onClick={onStartAddingCategory}
          className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors"
        >
          <Plus size={18} className="text-white" />
        </button>
      </div>
      
      {/* Add category form */}
      {isAddingCategory && (
        <div className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => onCategoryNameChange(e.target.value)}
            placeholder="Category name"
            className="w-full mb-2 p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              onClick={onAddCategory}
              className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <Save size={16} className="text-white" />
            </button>
            <button
              onClick={onCancelAddingCategory}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>
      )}
      
      {/* Categories list */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        {categories.map((category) => (
          <div key={category.id} className="group">
            {editingCategory?.id === category.id ? (
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => onCategoryNameChange(e.target.value)}
                  className="w-full mb-2 p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={onUpdateCategory}
                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    <Save size={16} className="text-white" />
                  </button>
                  <button
                    onClick={onCancelEditingCategory}
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedCategory?.id === category.id
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => onCategorySelect(category)}
              >
                <div className="flex items-center">
                  <Folder className="mr-2 text-white" size={18} />
                  <div>
                    <span className={`font-medium ${selectedCategory?.id === category.id ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-gray-800 dark:text-gray-200'}`}>{category.name}</span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      ({category.notes_count} notes)
                    </span>
                  </div>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEditingCategory(category);
                    }}
                    className="p-1 text-gray-500 hover:text-indigo-600 mr-1"
                  >
                    <Edit size={16} className="text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryToDelete(category);
                    }}
                    className="p-1 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 size={16} className="text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <DeleteConfirmationModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => {
          if (categoryToDelete) {
            onDeleteCategory(categoryToDelete.id);
            setCategoryToDelete(null);
          }
        }}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? This will also delete all notes in this category.`}
      />
    </div>
  );
};

export default CategoryList;