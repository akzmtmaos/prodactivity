import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Moon, Sun, Bell, User, Shield, Image as ImageIcon, Lock, LogOut, Trash2, Mail, User as UserIcon, Info, Phone, Calendar, MapPin } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import PageLayout from '../components/PageLayout';
import ActivityLogs from '../components/settings/ActivityLogs';
import axiosInstance from '../utils/axiosConfig';
import { API_BASE_URL } from '../config/api';

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autosaveNotes: boolean;
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
    autosaveNotes: localStorage.getItem('autosaveNotes') !== 'false' // Default to true
  });
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
  const [newPasswordError, setNewPasswordError] = useState('');
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
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/change-password/`, {
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
      const token = localStorage.getItem('accessToken');
      
      // Verify password and delete account in one call
      const response = await fetch(`${API_BASE_URL}/api/delete-account/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          password: deletePassword
        })
      });

      if (response.ok) {
        // Account deleted successfully - clear all data and redirect to login
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userSettings');
        localStorage.clear(); // Clear all localStorage
        window.location.href = '/login';
      } else {
        const data = await response.json();
        setDeleteError(data.detail || 'Incorrect password or failed to delete account');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      setDeleteError('Network error. Please try again.');
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
                      <button onClick={handleDeleteAccountClick} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
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
                <div className="space-y-6">
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
                  {/* Preferences Section */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <Bell size={24} className="text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white">
                          Preferences
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
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                              Autosave Notes
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Automatically save notes while you type
                            </p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('autosaveNotes', !settings.autosaveNotes)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.autosaveNotes ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.autosaveNotes ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <ActivityLogs />
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
      {showLogoutModal && ReactDOM.createPortal(
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
        </div>,
        document.body
      )}
    </PageLayout>
  );
};

export default Settings;
