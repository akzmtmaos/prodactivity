import React, { useEffect, useState } from 'react';
import { Moon, Sun, Bell, User, Shield, Globe, Image as ImageIcon, Lock, LogOut, Trash2, Mail, User as UserIcon, Info, Phone, Calendar, MapPin } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import PageLayout from '../components/PageLayout';

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
  timezone: string;
}

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'general', label: 'General' },
  { key: 'logs', label: 'Logs' }, // Add logs tab
  { key: 'other', label: 'Another Category' },
  { key: 'logout', label: 'Log Out' },
];

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
  const [passwordFields, setPasswordFields] = useState({ current: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
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
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://192.168.56.1:8000/api/change-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordFields.current,
          new_password: passwordFields.new
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordError('');
        setValidationErrors({});
        setPasswordFields({ current: '', new: '', confirm: '' });
        setShowPasswordModal(false);
        // Show success message
        setProfileMessage({ type: 'success', text: 'Password changed successfully!' });
        setTimeout(() => setProfileMessage(null), 3000);
      } else {
        setPasswordError(data.detail || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError('Network error. Please try again.');
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
    if (key === 'theme') {
      setTheme(value);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      localStorage.setItem('userSettings', JSON.stringify(settings));
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
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
          
          const res = await fetch('http://192.168.56.1:8000/api/avatar/', {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });
          
          if (res.ok) {
            const data = await res.json();
            updatedProfile.avatar = data.avatar;
            
            // Clear the selected file and preview since it's now saved
            setSelectedAvatarFile(null);
            setAvatarPreview('');
          } else {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Failed to update profile picture.');
          }
        } catch (avatarError) {
          console.error('Avatar upload error:', avatarError);
          throw new Error('Failed to upload profile picture. Please try again.');
        }
      }

      // Save profile data to localStorage (simulate API call)
      const updatedUser = { ...user, ...updatedProfile };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setProfile(updatedProfile);
      
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
      {/* Header and messages at the top */}
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account and preferences</p>
        </div>


        {/* Main row: sticky sidebar + content */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sticky Sidebar */}
          <div className="w-full md:w-64 mb-6 md:mb-0">
            <nav className="flex md:flex-col gap-2 md:gap-0 md:sticky md:top-8">
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
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors mb-2 md:mb-0 md:mt-0 md:rounded-none md:border-l-4 md:border-l-transparent md:px-6 md:py-2 md:text-base focus:outline-none ${
                    tab.key === 'logout'
                      ? 'bg-transparent text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 md:hover:border-l-red-400'
                      : activeTab === tab.key
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 md:border-l-indigo-600 dark:md:border-l-indigo-400 font-semibold'
                        : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 md:hover:border-l-indigo-400'
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
                <div className="space-y-8 max-w-2xl mx-auto">
                  {/* Profile Message */}
                  {profileMessage && (
                    <div className={`mb-6 p-4 rounded-lg ${
                      profileMessage.type === 'success'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }`}>
                      {profileMessage.text}
                    </div>
                  )}
                  {/* Personal Info Card */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                      <UserIcon size={20} /> Personal Info
                    </h2>
                    <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                      {/* Avatar */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar Preview" className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500" />
                          ) : profile.avatar ? (
                            <img src={profile.avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500" />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-indigo-500">
                              <UserIcon size={40} className="text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                          <label className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2 cursor-pointer shadow-lg transition-colors">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleAvatarChange}
                            />
                            <UserIcon size={16} />
                          </label>
                        </div>
                      </div>
                      {/* Fields */}
                      <div className="flex-1 grid grid-cols-1 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Username:</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                              <UserIcon size={18} />
                            </span>
                            <input
                              type="text"
                              value={profile.username}
                              onChange={e => handleProfileChange('username', e.target.value)}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/80 dark:bg-gray-800/80 text-black dark:text-white shadow-sm focus:shadow-indigo-200 dark:focus:shadow-indigo-900"
                              placeholder="Username"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email:</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                              <Mail size={18} />
                            </span>
                            <input
                              type="email"
                              value={profile.email}
                              onChange={e => handleProfileChange('email', e.target.value)}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/80 dark:bg-gray-800/80 text-black dark:text-white shadow-sm focus:shadow-indigo-200 dark:focus:shadow-indigo-900"
                              placeholder="Email address"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Security Card */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                      <Lock size={20} /> Security
                    </h2>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
                      <button onClick={() => setShowPasswordModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
                        <Lock size={16} /> Change Password
                      </button>
                      <button onClick={() => setShowDeleteModal(true)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
                        <Trash2 size={16} /> Delete Account
                      </button>
                    </div>
                  </div>
                  {/* Save Button */}
                  <div className="flex justify-end">
                    <button onClick={saveProfile} disabled={isProfileSaving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {isProfileSaving ? (<><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>Saving...</>) : 'Save Profile'}
                    </button>
                  </div>
                  {/* Change Password Modal */}
                  {showPasswordModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-md mx-4">
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                          <Lock size={20}/> Change Password
                        </h3>
                        <div className="space-y-5">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
                            <input 
                              type="password" 
                              value={passwordFields.current} 
                              onChange={e => {
                                setPasswordFields(f => ({ ...f, current: e.target.value }));
                                setPasswordError('');
                                // Clear validation error when user starts typing
                                if (validationErrors.current) {
                                  setValidationErrors(prev => ({ ...prev, current: undefined }));
                                }
                              }}
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm ${
                                validationErrors.current 
                                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                                  : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500'
                              }`}
                              placeholder="Enter current password"
                            />
                            {validationErrors.current && (
                              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                {validationErrors.current}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                            <input 
                              type="password" 
                              value={passwordFields.new} 
                              onChange={e => {
                                setPasswordFields(f => ({ ...f, new: e.target.value }));
                                setPasswordError('');
                                // Clear validation error when user starts typing
                                if (validationErrors.new) {
                                  setValidationErrors(prev => ({ ...prev, new: undefined }));
                                }
                              }}
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm ${
                                validationErrors.new 
                                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                                  : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500'
                              }`}
                              placeholder="Enter new password"
                            />
                            {validationErrors.new && (
                              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                {validationErrors.new}
                              </p>
                            )}

                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                            <input 
                              type="password" 
                              value={passwordFields.confirm} 
                              onChange={e => {
                                setPasswordFields(f => ({ ...f, confirm: e.target.value }));
                                setPasswordError('');
                                // Clear validation error when user starts typing
                                if (validationErrors.confirm) {
                                  setValidationErrors(prev => ({ ...prev, confirm: undefined }));
                                }
                              }}
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm ${
                                validationErrors.confirm 
                                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                                  : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500'
                              }`}
                              placeholder="Confirm new password"
                            />
                            {validationErrors.confirm && (
                              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                {validationErrors.confirm}
                              </p>
                            )}
                          </div>
                          {passwordError && (
                            <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                              {passwordError}
                            </div>
                          )}
                        </div>
                        <div className="mt-8 flex justify-end gap-3">
                          <button 
                            onClick={() => {
                              setShowPasswordModal(false);
                              setPasswordFields({ current: '', new: '', confirm: '' });
                              setPasswordError('');
                              setValidationErrors({});
                            }} 
                            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleChangePassword}
                            disabled={isChangingPassword || Object.keys(validationErrors).some(key => validationErrors[key as keyof typeof validationErrors])}
                            className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                              (isChangingPassword || Object.keys(validationErrors).some(key => validationErrors[key as keyof typeof validationErrors])) 
                                ? 'opacity-70 cursor-not-allowed bg-gray-400' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                          >
                            {isChangingPassword ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                Changing...
                              </>
                            ) : Object.keys(validationErrors).some(key => validationErrors[key as keyof typeof validationErrors]) ? (
                              'Please fix validation errors'
                            ) : (
                              'Change Password'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Delete Account Modal */}
                  {showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Trash2 size={18}/> Delete Account</h3>
                        <p className="mb-4 text-gray-700 dark:text-gray-300">Are you sure you want to delete your account? This action cannot be undone.</p>
                        {deleteError && <div className="text-red-600 text-sm mb-2">{deleteError}</div>}
                        <div className="mt-6 flex justify-end gap-2">
                          <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                          <button onClick={() => {/* handle delete logic */}} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">Delete Account</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'general' && (
                <div className="space-y-6">
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
                  {/* Appearance Section */}
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl shadow-md border border-indigo-100 dark:border-indigo-700">
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
                          <div className="grid grid-cols-2 gap-4">
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
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Notifications Section */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
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
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
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
                            className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 text-black dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                            className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 text-black dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
              )}

              {activeTab === 'logs' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 max-w-xl mx-auto text-center">
                    <Info size={32} className="mx-auto mb-4 text-indigo-500 dark:text-indigo-400" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Logs</h2>
                    <p className="text-gray-600 dark:text-gray-400">This section will display your recent activity logs and system events in the future.</p>
                  </div>
                </div>
              )}

              {activeTab === 'other' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 max-w-xl mx-auto text-center">
                    <Shield size={32} className="mx-auto mb-4 text-indigo-500 dark:text-indigo-400" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Another Category</h2>
                    <p className="text-gray-600 dark:text-gray-400">This is a placeholder for future settings or features.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Log Out Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Confirm Logout</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Settings;
