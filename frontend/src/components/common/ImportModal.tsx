import React, { useState, useRef } from 'react';
import { FileUp, X, Loader2 } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
  acceptedFileTypes: string[];
  title?: string;
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  acceptedFileTypes,
  title = 'Import Document'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!acceptedFileTypes.includes(file.type)) {
      setError(`Unsupported file type. Please upload a ${acceptedFileTypes.join(', ')} file.`);
      return;
    }

    await handleFile(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    await handleFile(file);
  };

  const handleFile = async (file: File) => {
    try {
      setIsImporting(true);
      await onImport(file);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import file. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileUp className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              Drag and drop your file here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Supported formats: {acceptedFileTypes.join(', ')}
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              disabled={isImporting}
            >
              Cancel
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Select File'
              )}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept={acceptedFileTypes.join(',')}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ImportModal; 