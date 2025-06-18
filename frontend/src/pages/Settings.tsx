import React, { useEffect, useState } from 'react';
import { Moon, Sun, Bell, User, Shield, Globe } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import PageLayout from '../components/PageLayout';

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
  timezone: string;
}

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any | null>(null);
  const [greeting, setGreeting] = useState('');
  const [settings, setSettings] = useState<UserSettings>({
    theme: theme,
    notifications: true,
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser && parsedUser.username) {
          setUser(parsedUser);
        } else {
          setUser({ username: 'User' });
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
        setUser({ username: 'User' });
      }
    } else {
      setUser({ username: 'User' });
    }

    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Load saved settings
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (e) {
        console.error('Error parsing saved settings:', e);
      }
    }
  }, []);

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Update theme immediately when changed
    if (key === 'theme') {
      setTheme(value);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Save to localStorage
      localStorage.setItem('userSettings', JSON.stringify(settings));
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setIsSaving(false);
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Show loading state while waiting for user data
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account and preferences
          </p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            saveMessage.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {saveMessage.text}
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          {/* Appearance Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                  <Sun size={24} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white">
                  Appearance
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => handleSettingChange('theme', 'light')}
                      className={`p-4 rounded-lg border transition-colors ${
                        settings.theme === 'light'
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <Sun size={24} className="mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                      <span className="block text-sm text-gray-700 dark:text-gray-300">Light</span>
                    </button>
                    <button
                      onClick={() => handleSettingChange('theme', 'dark')}
                      className={`p-4 rounded-lg border transition-colors ${
                        settings.theme === 'dark'
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <Moon size={24} className="mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                      <span className="block text-sm text-gray-700 dark:text-gray-300">Dark</span>
                    </button>
                    <button
                      onClick={() => handleSettingChange('theme', 'system')}
                      className={`p-4 rounded-lg border transition-colors ${
                        settings.theme === 'system'
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="mx-auto mb-2 flex items-center justify-center">
                        <Sun size={16} className="text-gray-600 dark:text-gray-400" />
                        <span className="mx-1 text-gray-400">/</span>
                        <Moon size={16} className="text-gray-600 dark:text-gray-400" />
                      </div>
                      <span className="block text-sm text-gray-700 dark:text-gray-300">System</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Bell size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <h2 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Enable Notifications
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive notifications for important updates
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('notifications', !settings.notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.notifications ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.notifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Language & Region Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Globe size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white">
                  Language & Region
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleSettingChange('timezone', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </PageLayout>
  );
};

export default Settings;
