import React, { useState } from 'react';
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1e1e1e] shadow-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header – compact */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Complete Task with Evidence</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content – compact */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Provide evidence for &quot;<span className="font-medium text-gray-700 dark:text-gray-300">{taskTitle}</span>&quot;. The task will be marked complete once submitted.
          </p>

          {error && (
            <div className="p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* File upload */}
          <div className="rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] p-3">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Upload evidence file</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Screenshots, documents, etc. (max 10MB)</p>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="block w-full text-xs text-gray-500 dark:text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-900/20 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/30"
            />
            {evidenceFile && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1.5">Selected: {evidenceFile.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Evidence description</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Describe what you accomplished (at least 20 characters)</p>
            <textarea
              value={evidenceDescription}
              onChange={(e) => setEvidenceDescription(e.target.value)}
              placeholder="Describe the evidence, what you accomplished, or provide links..."
              rows={3}
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer – compact */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-[#333333] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#252525] hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleEvidenceUpload}
            disabled={loading || (!evidenceFile && !evidenceDescription.trim())}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Completing...' : 'Complete Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskActivityModal;
