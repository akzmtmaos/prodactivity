import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Moon, Sun, Bell, Shield, Lock, Trash2, Mail, User as UserIcon, Info, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import PageLayout from '../components/PageLayout';
import ActivityLogs from '../components/settings/ActivityLogs';
import axiosInstance from '../utils/axiosConfig';
import { API_BASE_URL } from '../config/api';
import { useTimer } from '../context/TimerContext';
import PomodoroModeToggle from '../components/studytimer/PomodoroModeToggle';

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autosaveNotes: boolean;
}

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'general', label: 'General' },
  { key: 'logs', label: 'Logs' }, // Add logs tab
  { key: 'logout', label: 'Log Out' },
];

// Study Timer Settings Component
const StudyTimerSettings: React.FC = () => {
  const { 
    timerState, 
    updateSettings,
    pomodoroMode,
    setPomodoroMode
  } = useTimer();
  
  const [tempSettings, setTempSettings] = useState(timerState.settings);
  
  // Pomodoro preset values
  const pomodoroPreset = {
    studyDuration: 25 * 60,
    breakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsUntilLongBreak: 4,
  };
  
  // Update tempSettings when timerState.settings changes
  useEffect(() => {
    setTempSettings(timerState.settings);
  }, [timerState.settings]);
  
  const handlePomodoroToggle = (enabled: boolean) => {
    setPomodoroMode(enabled);
    if (enabled) {
      // Pomodoro ON: Set to classic Pomodoro preset
      updateSettings(pomodoroPreset);
      setTempSettings(pomodoroPreset);
    }
    // Pomodoro OFF: Keep current settings, just change behavior
  };
  
  const handleSave = () => {
    updateSettings(tempSettings);
  };
  
  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const labelClass = "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="space-y-4">
      <div>
        <PomodoroModeToggle enabled={pomodoroMode} onToggle={handlePomodoroToggle} />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
          Pomodoro ON: auto study/break. OFF: timer stops at 00:00.
          {pomodoroMode && ' Classic: 25 / 5 / 15 min, 4 sessions per long break.'}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Study (min)</label>
          <input type="number" value={tempSettings.studyDuration / 60} onChange={(e) => setTempSettings({ ...tempSettings, studyDuration: parseInt(e.target.value || '0') * 60 })} className={inputClass} min={1} />
        </div>
        <div>
          <label className={labelClass}>Break (min)</label>
          <input type="number" value={tempSettings.breakDuration / 60} onChange={(e) => setTempSettings({ ...tempSettings, breakDuration: parseInt(e.target.value || '0') * 60 })} className={inputClass} min={1} />
        </div>
        <div>
          <label className={labelClass}>Long break (min)</label>
          <input type="number" value={tempSettings.longBreakDuration / 60} onChange={(e) => setTempSettings({ ...tempSettings, longBreakDuration: parseInt(e.target.value || '0') * 60 })} className={inputClass} min={1} />
        </div>
        <div>
          <label className={labelClass}>Sessions until long break</label>
          <input type="number" value={tempSettings.sessionsUntilLongBreak} onChange={(e) => setTempSettings({ ...tempSettings, sessionsUntilLongBreak: parseInt(e.target.value || '0') })} className={inputClass} min={1} />
        </div>
      </div>
      <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-[#333333]">
        <button onClick={handleSave} className="h-7 px-3 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1">
          Save Timer Settings
        </button>
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    theme: theme,
    notifications: true,
    autosaveNotes: localStorage.getItem('autosaveNotes') !== 'false' // Default to true
  });

  // Sync settings.theme with theme from context
  useEffect(() => {
    setSettings(prev => ({ ...prev, theme: theme }));
  }, [theme]);
  const [activeTab, setActiveTab] = useState<'profile' | 'general' | 'logs' | 'other' | 'logout'>('profile');

  // Profile management state
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    displayName: '',
    bio: '',
    phone: '',
    dob: '',
    location: '',
    password: '',
    avatar: ''
  });
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false);
  const [showFinalDeleteConfirmation, setShowFinalDeleteConfirmation] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [passwordFields, setPasswordFields] = useState({ current: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});

  // Password validation function
  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one capital letter' };
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one special character' };
    }
    return { isValid: true, message: '' };
  };

  // Change password handler
  const handleChangePassword = async () => {
    // Clear previous errors
    setPasswordError('');
    setValidationErrors({});

    // Validate current password
    if (!passwordFields.current) {
      setValidationErrors(prev => ({ ...prev, current: 'Current password is required' }));
      return;
    }

    // Validate new password
    const passwordValidation = validatePassword(passwordFields.new);
    if (!passwordValidation.isValid) {
      setValidationErrors(prev => ({ ...prev, new: passwordValidation.message }));
      return;
    }

    // Check if passwords match
    if (passwordFields.new !== passwordFields.confirm) {
      setValidationErrors(prev => ({ ...prev, confirm: 'New passwords do not match' }));
      return;
    }

    setIsChangingPassword(true);
    try {
      await axiosInstance.post('/change-password/', {
        current_password: passwordFields.current,
        new_password: passwordFields.new
      });

      setPasswordError('');
      setValidationErrors({});
      setPasswordFields({ current: '', new: '', confirm: '' });
      setShowPasswordModal(false);
      // Show success message
      setProfileMessage({ type: 'success', text: 'Password changed successfully!' });
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (error: any) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message ||
                          error.message || 
                          'Network error. Please try again.';
      setPasswordError(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  // Delete account flow handlers
  const handleDeleteAccountClick = () => {
    setShowDeleteModal(true);
  };

  // Step 1 -> Step 2 (First confirmation to second confirmation)
  const handleDeleteModalConfirm = () => {
    setShowDeleteModal(false);
    setShowFinalDeleteConfirmation(true);
  };

  // Step 2 -> Step 3 (Second confirmation to password input)
  const handleFinalConfirmToPasword = () => {
    setShowFinalDeleteConfirmation(false);
    setShowDeletePasswordModal(true);
  };

  // Step 3 -> Delete (Password verification and account deletion)
  const handlePasswordVerificationAndDelete = async () => {
    setDeleteError('');
    
    if (!deletePassword) {
      setDeleteError('Password is required');
      return;
    }

    setIsDeletingAccount(true);
    
    try {
      // Verify password and delete account in one call
      await axiosInstance.post('/delete-account/', {
        password: deletePassword
      });

      // Account deleted successfully - clear all data and redirect to login
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userSettings');
      localStorage.clear(); // Clear all localStorage
      window.location.href = '/login';
    } catch (error: any) {
      console.error('Delete account error:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message ||
                          error.message || 
                          'Network error. Please try again.';
      setDeleteError(errorMessage);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser && parsedUser.username) {
          setUser(parsedUser);
          setProfile({
            username: parsedUser.username || '',
            email: parsedUser.email || '',
            password: '',
            avatar: parsedUser.avatar || '',
            displayName: parsedUser.displayName || '',
            bio: parsedUser.bio || '',
            phone: parsedUser.phone || '',
            dob: parsedUser.dob || '',
            location: parsedUser.location || ''
          });
        } else {
          setUser({ username: 'User' });
          setProfile({ username: 'User', email: '', password: '', avatar: '', displayName: '', bio: '', phone: '', dob: '', location: '' });
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
        setUser({ username: 'User' });
        setProfile({ username: 'User', email: '', password: '', avatar: '', displayName: '', bio: '', phone: '', dob: '', location: '' });
      }
    } else {
      setUser({ username: 'User' });
      setProfile({ username: 'User', email: '', password: '', avatar: '', displayName: '', bio: '', phone: '', dob: '', location: '' });
    }

    // Set greeting based on time of day
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

  // Cleanup effect for avatar preview URL
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Auto-save settings to localStorage
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    
    if (key === 'theme') {
      setTheme(value);
    }
    
    if (key === 'autosaveNotes') {
      localStorage.setItem('autosaveNotes', String(value));
    }
  };


  // Profile management handlers
  const handleProfileChange = (key: keyof typeof profile, value: string) => {
    setProfile({ ...profile, [key]: value });
  };

  // Image optimization function
  const optimizeImage = (file: File, maxWidth: number = 300, maxHeight: number = 300, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress the image
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          } else {
            resolve(file); // Fallback to original file
          }
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setProfileMessage({ type: 'error', text: 'Please select a valid image file.' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage({ type: 'error', text: 'Image size must be less than 5MB.' });
      return;
    }

    // Clear any previous messages
    setProfileMessage(null);

    // Clean up previous preview URL
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    // Store the selected file
    setSelectedAvatarFile(file);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  };

  const saveProfile = async () => {
    setIsProfileSaving(true);
    setProfileMessage(null);
    
    try {
      let updatedProfile = { ...profile };

      // Handle avatar upload if a new file was selected
      if (selectedAvatarFile) {
        try {
          // Optimize the image before upload
          const optimizedFile = await optimizeImage(selectedAvatarFile, 300, 300, 0.8);
          
          const formData = new FormData();
          formData.append('avatar', optimizedFile);
          const token = localStorage.getItem('accessToken');
          
          console.log('📸 Uploading avatar...', {
            fileName: optimizedFile.name,
            fileSize: optimizedFile.size,
            fileType: optimizedFile.type
          });
          
          const res = await fetch(`${API_BASE_URL}/avatar/`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              // Don't set Content-Type header - let browser set it with boundary for FormData
            },
            body: formData,
          });
          
          console.log('📸 Avatar upload response:', {
            status: res.status,
            statusText: res.statusText,
            contentType: res.headers.get('content-type')
          });
          
          if (res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await res.json();
              console.log('✅ Avatar uploaded successfully:', data);
              updatedProfile.avatar = data.avatar;
              
              // Clear the selected file and preview since it's now saved
              setSelectedAvatarFile(null);
              setAvatarPreview('');
            } else {
              // Response is not JSON, might be HTML error page
              const text = await res.text();
              console.error('❌ Avatar upload returned non-JSON response:', text.substring(0, 200));
              throw new Error('Server returned an invalid response. Please try again.');
            }
          } else {
            // Try to parse error response
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await res.json();
              console.error('❌ Avatar upload error:', errorData);
              throw new Error(errorData.message || errorData.error || 'Failed to update profile picture.');
            } else {
              const text = await res.text();
              console.error('❌ Avatar upload error (non-JSON):', text.substring(0, 200));
              throw new Error(`Failed to update profile picture (${res.status} ${res.statusText}).`);
            }
          }
        } catch (avatarError: any) {
          console.error('❌ Avatar upload error:', avatarError);
          const errorMessage = avatarError.message || 'Failed to upload profile picture. Please try again.';
          throw new Error(errorMessage);
        }
      }

      // Save profile data to backend
      try {
        const res = await axiosInstance.patch('/me/', {
          username: profile.username,
          email: profile.email,
          displayName: profile.displayName,
          bio: profile.bio,
          phone: profile.phone,
          dob: profile.dob,
          location: profile.location,
        });
        
        console.log('✅ Profile updated on backend:', res.data);
        
        // Use the user data returned from backend
        if (res.data.user) {
          updatedProfile = {
            ...updatedProfile,
            username: res.data.user.username,
            email: res.data.user.email,
            displayName: res.data.user.displayName,
            bio: res.data.user.bio,
            phone: res.data.user.phone,
            dob: res.data.user.dob,
            location: res.data.user.location,
            avatar: res.data.user.avatar || updatedProfile.avatar,
          };
        }
      } catch (profileError: any) {
        console.error('Profile update error:', profileError);
        const errorMessage = profileError.response?.data?.message || 
                            profileError.response?.data?.detail ||
                            profileError.message || 
                            'Failed to update profile. Please try again.';
        throw new Error(errorMessage);
      }

      // Save profile data to localStorage
      const updatedUser = { ...user, ...updatedProfile };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setProfile(updatedProfile);
      
      // Dispatch custom event to notify other components (like Navbar and Profile) to update
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { 
        detail: { user: updatedUser } 
      }));
      
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Save profile error:', error);
      setProfileMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update profile. Please try again.' });
    } finally {
      setIsProfileSaving(false);
      setTimeout(() => setProfileMessage(null), 3000);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Manage your account and preferences</p>
        </div>

        {/* Main row: sticky sidebar + content */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar – compact nav */}
          <div className="w-full md:w-56 flex-shrink-0 mb-4 md:mb-0">
            <nav className="flex flex-row md:flex-col gap-1 md:sticky md:top-8 border-b md:border-b-0 border-gray-200 dark:border-gray-700 pb-2 md:pb-0">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    if (tab.key === 'logout') {
                      setShowLogoutModal(true);
                    } else {
                      setActiveTab(tab.key as 'profile' | 'general' | 'logs' | 'other' | 'logout');
                    }
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none md:pl-4 md:border-l-2 ${
                    tab.key === 'logout'
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 md:border-l-transparent'
                      : activeTab === tab.key
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 md:border-l-indigo-600 dark:md:border-l-indigo-400 md:rounded-l-none'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 md:border-l-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          {/* Main Content */}
          <div className="flex-1">
            <div>
              {activeTab === 'profile' && (
                <div className="space-y-6 max-w-2xl">
                  {profileMessage && (
                    <div className={`p-3 rounded-lg text-sm ${
                      profileMessage.type === 'success'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }`}>
                      {profileMessage.text}
                    </div>
                  )}
                  {/* Personal Info */}
                  <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-[#333333] p-4">
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                      <UserIcon size={18} /> Personal Info
                    </h2>
                    <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
                      <div className="flex flex-col items-center gap-1">
                        <div className="relative">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar Preview" className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500" />
                          ) : profile.avatar ? (
                            <img src={profile.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500" />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-indigo-500">
                              <UserIcon size={32} className="text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                          <label className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-1.5 cursor-pointer transition-colors">
                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                            <UserIcon size={14} />
                          </label>
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-1 gap-4 w-full">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400"><UserIcon size={14} /></span>
                            <input
                              type="text"
                              value={profile.username}
                              onChange={e => handleProfileChange('username', e.target.value)}
                              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="Username"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400"><Mail size={14} /></span>
                            <input
                              type="email"
                              value={profile.email}
                              onChange={e => handleProfileChange('email', e.target.value)}
                              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="Email address"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Security */}
                  <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-[#333333] p-4">
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                      <Lock size={18} /> Security
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setShowPasswordModal(true)} className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                        <Lock size={12} /> Change Password
                      </button>
                      <button onClick={handleDeleteAccountClick} className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-lg border border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 size={12} /> Delete Account
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={saveProfile} disabled={isProfileSaving} className="inline-flex items-center gap-2 h-7 px-3 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {isProfileSaving ? (<><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving...</>) : 'Save Profile'}
                    </button>
                  </div>
                  {/* Change Password Modal */}
                  {showPasswordModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-[#333333] shadow-xl p-5 w-full max-w-md mx-4">
                        <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                          <Lock size={18} /> Change Password
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                            <input 
                              type="password" 
                              value={passwordFields.current} 
                              onChange={e => {
                                setPasswordFields(f => ({ ...f, current: e.target.value }));
                                setPasswordError('');
                                if (validationErrors.current) setValidationErrors(prev => ({ ...prev, current: undefined }));
                              }}
                              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 bg-white dark:bg-[#252525] text-gray-900 dark:text-white ${
                                validationErrors.current ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-[#333333] focus:ring-indigo-500'
                              }`}
                              placeholder="Current password"
                            />
                            {validationErrors.current && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.current}</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                            <input 
                              type="password" 
                              value={passwordFields.new} 
                              onChange={e => {
                                setPasswordFields(f => ({ ...f, new: e.target.value }));
                                setPasswordError('');
                                if (validationErrors.new) setValidationErrors(prev => ({ ...prev, new: undefined }));
                              }}
                              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 bg-white dark:bg-[#252525] text-gray-900 dark:text-white ${
                                validationErrors.new ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-[#333333] focus:ring-indigo-500'
                              }`}
                              placeholder="New password"
                            />
                            {validationErrors.new && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.new}</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                            <input 
                              type="password" 
                              value={passwordFields.confirm} 
                              onChange={e => {
                                setPasswordFields(f => ({ ...f, confirm: e.target.value }));
                                setPasswordError('');
                                if (validationErrors.confirm) setValidationErrors(prev => ({ ...prev, confirm: undefined }));
                              }}
                              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 bg-white dark:bg-[#252525] text-gray-900 dark:text-white ${
                                validationErrors.confirm ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-[#333333] focus:ring-indigo-500'
                              }`}
                              placeholder="Confirm new password"
                            />
                            {validationErrors.confirm && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.confirm}</p>}
                          </div>
                          {passwordError && (
                            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{passwordError}</div>
                          )}
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                          <button 
                            onClick={() => { setShowPasswordModal(false); setPasswordFields({ current: '', new: '', confirm: '' }); setPasswordError(''); setValidationErrors({}); }} 
                            className="h-7 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333333] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleChangePassword}
                            disabled={isChangingPassword || Object.keys(validationErrors).some(k => validationErrors[k as keyof typeof validationErrors])}
                            className={`h-7 px-3 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${
                              isChangingPassword || Object.keys(validationErrors).some(k => validationErrors[k as keyof typeof validationErrors])
                                ? 'opacity-60 cursor-not-allowed bg-gray-400 dark:bg-gray-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                          >
                            {isChangingPassword ? (<><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Changing...</>) : Object.keys(validationErrors).some(k => validationErrors[k as keyof typeof validationErrors]) ? 'Fix errors' : 'Change Password'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Step 1: Initial Delete Account Warning Modal */}
                  {showDeleteModal && ReactDOM.createPortal(
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-md mx-4 border border-red-200 dark:border-red-800">
                        <div className="text-center mb-6">
                          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                            <Trash2 size={32} className="text-red-600 dark:text-red-400"/>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Delete Account?</h3>
                          <p className="text-gray-600 dark:text-gray-400">This action is permanent and cannot be undone.</p>
                        </div>
                        
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                          <p className="text-sm text-red-800 dark:text-red-300 font-semibold mb-2">⚠️ You will lose:</p>
                          <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 ml-4">
                            <li>• All your tasks and productivity data</li>
                            <li>• All notes and decks</li>
                            <li>• XP, achievements, and streaks</li>
                            <li>• All account information</li>
                          </ul>
                        </div>
                        
                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              setShowDeleteModal(false);
                              setDeleteError('');
                            }} 
                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleDeleteModalConfirm}
                            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}

                  {/* Step 2: Password Verification Modal */}
                  {showDeletePasswordModal && ReactDOM.createPortal(
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-md mx-4">
                        <div className="mb-6">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <Lock size={20}/> Verify Your Password
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Please enter your password to confirm account deletion.</p>
                        </div>
                        
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                          <input 
                            type="password" 
                            value={deletePassword}
                            onChange={e => {
                              setDeletePassword(e.target.value);
                              setDeleteError('');
                            }}
                            onKeyDown={e => e.key === 'Enter' && !isDeletingAccount && deletePassword && handlePasswordVerificationAndDelete()}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                            placeholder="Enter your password"
                            autoFocus
                          />
                          {deleteError && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                              {deleteError}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              setShowDeletePasswordModal(false);
                              setDeletePassword('');
                              setDeleteError('');
                            }}
                            disabled={isDeletingAccount}
                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handlePasswordVerificationAndDelete}
                            disabled={isDeletingAccount || !deletePassword}
                            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isDeletingAccount ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                Deleting Account...
                              </>
                            ) : (
                              'DELETE MY ACCOUNT'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}

                  {/* Step 3: Final Confirmation Modal */}
                  {showFinalDeleteConfirmation && ReactDOM.createPortal(
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-md mx-4 border-2 border-red-500">
                        <div className="text-center mb-6">
                          <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
                            <Trash2 size={40} className="text-red-600 dark:text-red-400"/>
                          </div>
                          <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-3">⚠️ FINAL WARNING</h3>
                          <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Your account will be permanently deleted.</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">This is your last chance to cancel.</p>
                        </div>
                        
                        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
                          <p className="text-sm text-red-800 dark:text-red-300 font-bold text-center">
                            ALL YOUR DATA WILL BE LOST FOREVER
                          </p>
                        </div>
                        
                        {deleteError && (
                          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
                          </div>
                        )}
                        
                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              setShowFinalDeleteConfirmation(false);
                              setDeletePassword('');
                              setDeleteError('');
                            }}
                            className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleFinalConfirmToPasword}
                            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                          >
                            Continue to Password
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              )}

              {activeTab === 'general' && (
                <div className="space-y-4 max-w-2xl">
                  {/* Appearance */}
                  <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-[#333333] p-4">
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                      <Sun size={18} className="text-indigo-500 dark:text-indigo-400" /> Appearance
                    </h2>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setTheme('light'); handleSettingChange('theme', 'light'); }}
                        className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-colors ${
                          theme === 'light' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-[#333333] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <Sun size={20} className="text-gray-600 dark:text-gray-400" />
                        Light
                      </button>
                      <button
                        onClick={() => { setTheme('dark'); handleSettingChange('theme', 'dark'); }}
                        className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-colors ${
                          theme === 'dark' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-[#333333] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <Moon size={20} className="text-gray-600 dark:text-gray-400" />
                        Dark
                      </button>
                    </div>
                  </div>
                  {/* Preferences */}
                  <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-[#333333] p-4">
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                      <Bell size={18} className="text-green-500 dark:text-green-400" /> Preferences
                    </h2>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Notifications</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Receive notifications for important updates</p>
                        </div>
                        <button
                          onClick={() => handleSettingChange('notifications', !settings.notifications)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${settings.notifications ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.notifications ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-200 dark:border-[#333333]">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Autosave Notes</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Automatically save notes while you type</p>
                        </div>
                        <button
                          onClick={() => handleSettingChange('autosaveNotes', !settings.autosaveNotes)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${settings.autosaveNotes ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autosaveNotes ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Study Timer */}
                  <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-[#333333] p-4">
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                      <Clock size={18} className="text-blue-500 dark:text-blue-400" /> Study Timer Settings
                    </h2>
                    <StudyTimerSettings />
                  </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <ActivityLogs />
              )}

              
            </div>
          </div>
        </div>
      </div>
      {showLogoutModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-[#333333] shadow-xl p-4 max-w-sm w-full mx-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Confirm Logout</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Are you sure you want to log out?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLogoutModal(false)} className="h-7 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333333] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors">
                Cancel
              </button>
              <button onClick={handleLogout} className="h-7 px-3 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors">
                Log Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </PageLayout>
  );
};

export default Settings;
