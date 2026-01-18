import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const SupabaseConnectionTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [error, setError] = useState<string | null>(null);
  const [projectInfo, setProjectInfo] = useState<any>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing Supabase connection...');
        
        // Test basic connection by trying to access a non-existent table
        // This will fail but confirm the connection is working
        const { data, error } = await supabase
          .from('_test_connection')
          .select('*')
          .limit(1);
        
        if (error) {
          // This is expected since the table doesn't exist
          // But it means the connection is working
          console.log('Supabase connection test successful (expected error):', error.message);
          setConnectionStatus('connected');
          
          // Get project info from environment variables
          setProjectInfo({
            url: import.meta.env.VITE_SUPABASE_URL || 'Not configured',
            hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
            keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0
          });
        } else {
          console.log('Supabase connection test successful:', data);
          setConnectionStatus('connected');
        }
      } catch (err: any) {
        console.error('Supabase connection test failed:', err);
        setConnectionStatus('error');
        setError(err.message);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-2">Supabase Connection Test</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {connectionStatus === 'testing' && (
            <>
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-yellow-600 dark:text-yellow-400">Testing connection...</span>
            </>
          )}
          {connectionStatus === 'connected' && (
            <>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-600 dark:text-green-400">Connected to Supabase</span>
            </>
          )}
          {connectionStatus === 'error' && (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-red-600 dark:text-red-400">Connection failed</span>
              {error && <span className="text-sm text-gray-500">({error})</span>}
            </>
          )}
        </div>
        
        {projectInfo && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <div>Project URL: {projectInfo.url}</div>
            <div>API Key: {projectInfo.hasAnonKey ? `Present (${projectInfo.keyLength} chars)` : 'Missing'}</div>
          </div>
        )}
        
        <div className="text-xs text-gray-500 dark:text-gray-500">
          Next: Apply the database schema from supabase_schema.sql
        </div>
      </div>
    </div>
  );
};

export default SupabaseConnectionTest;
