import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserMinus, MessageCircle, Mail, GraduationCap, Calendar, MapPin } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { getAvatarUrl } from './utils';

interface UserProfileModalProps {
  username: string;
  onClose: () => void;
  onStartChat?: (username: string) => void;
}

interface UserProfileData {
  id: string;
  username: string;
  email?: string;
  avatar: string | null;
  bio: string;
  school: string;
  year: string;
  course: string;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_own_profile: boolean;
  date_joined: string;
  email_verified: boolean;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  username,
  onClose,
  onStartChat
}) => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, [username]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get(`/profile/${username}/`);
      const data = response.data;
      
      setProfile(data);
      setIsFollowing(data.is_following || false);
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    
    try {
      setFollowLoading(true);
      if (isFollowing) {
        await axiosInstance.post(`/unfollow/${username}/`);
        setIsFollowing(false);
        setProfile(prev => prev ? { ...prev, followers_count: Math.max(0, prev.followers_count - 1) } : null);
      } else {
        await axiosInstance.post(`/follow/${username}/`);
        setIsFollowing(true);
        setProfile(prev => prev ? { ...prev, followers_count: prev.followers_count + 1 } : null);
      }
    } catch (err: any) {
      console.error('Error following/unfollowing:', err);
      setError(err.response?.data?.message || 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleStartChatClick = () => {
    if (onStartChat && username) {
      onStartChat(username);
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-full w-24 mx-auto"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400">{error || 'User not found'}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const avatarUrl = profile.avatar ? getAvatarUrl(profile.avatar) : null;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          {/* Avatar and Basic Info */}
          <div className="text-center mb-6">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile.username}
                className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-indigo-200 dark:border-indigo-800"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4 border-4 border-indigo-200 dark:border-indigo-800">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-3xl">
                  {profile.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {profile.username}
            </h1>
            
            {(profile.school || profile.course) && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {profile.school && <span>{profile.school}</span>}
                {profile.course && profile.school && <span> • </span>}
                {profile.course && <span>{profile.course}</span>}
                {profile.year && <span> • {profile.year}</span>}
              </p>
            )}

            {/* Follow/Unfollow Stats */}
            <div className="flex justify-center gap-6 mt-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {profile.followers_count || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {profile.following_count || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Following</div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Profile Details */}
          <div className="space-y-3 mb-6">
            {profile.email && !profile.is_own_profile && (
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Mail size={16} />
                <span>{profile.email}</span>
              </div>
            )}
            
            {profile.school && (
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <GraduationCap size={16} />
                <span>{profile.school}</span>
              </div>
            )}
            
            {profile.course && (
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <GraduationCap size={16} />
                <span>{profile.course}</span>
              </div>
            )}
            
            {profile.year && (
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Calendar size={16} />
                <span>{profile.year}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!profile.is_own_profile && (
            <div className="flex gap-3">
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isFollowing
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {followLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : isFollowing ? (
                  <>
                    <UserMinus size={18} />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Follow
                  </>
                )}
              </button>
              
              {onStartChat && (
                <button
                  onClick={handleStartChatClick}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <MessageCircle size={18} />
                  Message
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;

