import React, { useState } from 'react';
import axios from 'axios';
import { supabase } from '../../lib/supabase';

interface TaskActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskTitle: string;
  onActivityLogged: () => void;
  onTaskCompleted?: (completedTask: any) => void;
}

const TaskActivityModal: React.FC<TaskActivityModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  onActivityLogged,
  onTaskCompleted
}) => {
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleEvidenceUpload = async () => {
    if (!evidenceFile && !evidenceDescription.trim()) {
      setError('Please provide either a file or description as evidence');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      let evidenceFileUrl = null;
      
      // Upload file to Supabase Storage if provided
      if (evidenceFile) {
        console.log('📁 Uploading evidence file to Supabase Storage:', evidenceFile.name);
        console.log('📁 File type:', evidenceFile.type);
        console.log('📁 File size:', evidenceFile.size, 'bytes');
        
        // Get current user ID
        const userData = localStorage.getItem('user');
        const user = userData ? JSON.parse(userData) : null;
        const userId = user?.id || 11;
        
        // Create a unique filename with sanitized original name
        const fileExt = evidenceFile.name.split('.').pop();
        const sanitizedName = evidenceFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${userId}_task${taskId}_${Date.now()}_${sanitizedName}`;
        const filePath = `${fileName}`;
        
        console.log('📁 Uploading to path:', filePath);
        console.log('📁 Bucket: task_evidence');
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('task_evidence')
          .upload(filePath, evidenceFile, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          console.error('❌ Supabase storage error:', uploadError);
          console.error('❌ Error code:', uploadError.message);
          console.error('❌ Error details:', uploadError);
          setError(`Failed to upload file: ${uploadError.message}. Please check if the storage bucket exists and is configured correctly.`);
          setLoading(false);
          return;
        }
        
        console.log('✅ Upload response:', uploadData);
        
        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('task_evidence')
          .getPublicUrl(filePath);
        
        evidenceFileUrl = urlData.publicUrl;
        console.log('✅ Evidence file uploaded successfully:', evidenceFileUrl);
      }
      
      // Update task in Supabase with evidence information
      console.log('📝 Updating task with evidence in Supabase:', taskId);
      
      const { data, error } = await supabase
        .from('tasks')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          evidence_uploaded: true,
          evidence_description: evidenceDescription.trim() || null,
          evidence_file: evidenceFileUrl,
          evidence_uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        setError(`Failed to update task: ${error.message}`);
        return;
      }
      
      console.log('✅ Task completed with evidence successfully:', data);
      
      // Update the task state in the parent component
      const completedTask = { ...data, dueDate: data.due_date };
      if (onTaskCompleted) {
        onTaskCompleted(completedTask);
      }
      
      onActivityLogged();
      onClose();
      
    } catch (err: any) {
      console.error('Evidence upload error:', err);
      setError('Failed to upload evidence. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setEvidenceFile(file);
      setError('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Complete Task with Evidence
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Provide evidence of your work to complete "<span className="font-medium">{taskTitle}</span>". The task will be automatically marked as complete once evidence is submitted.
        </p>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Evidence Upload Section */}
        <div className="space-y-6">
          {/* File Upload */}
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Upload Evidence File</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Screenshots, documents, or any file that proves your work (max 10MB)
            </p>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {evidenceFile && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                Selected: {evidenceFile.name}
              </p>
            )}
          </div>

          {/* Evidence Description */}
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Evidence Description</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Provide a detailed description of what you accomplished (at least 20 characters)
            </p>
            <textarea
              value={evidenceDescription}
              onChange={(e) => setEvidenceDescription(e.target.value)}
              placeholder="Describe the evidence of your work, what you accomplished, or provide links to your work..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none mb-3"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
                         <button
               onClick={handleEvidenceUpload}
               disabled={loading || (!evidenceFile && !evidenceDescription.trim())}
               className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
             >
               {loading ? 'Completing Task...' : 'Complete Task'}
             </button>
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskActivityModal;
