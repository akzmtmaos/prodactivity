import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Settings, User, HelpCircle, LogOut, Moon, Sun, Menu, ChevronRight, CheckCircle, AlertTriangle, Clock, FileText, BookOpen, Calendar, Info, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationsContext } from '../context/NotificationsContext';
import { useTheme } from '../context/ThemeContext';
import { useNavbar } from '../context/NavbarContext';
import GlobalSearchModal from './common/GlobalSearchModal';
import HelpModal from './common/HelpModal';
import HeaderTooltip from './common/HeaderTooltip';
import { getAvatarUrl } from './chat/utils';

interface HeaderProps {
  pageTitle?: string;
  pageDescription?: string;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, pageDescription }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount, notifications, markAsRead } = useNotificationsContext();
  const { theme, setTheme } = useTheme();
  const { isCollapsed, setIsCollapsed } = useNavbar();
  const [user, setUser] = useState<any | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsPopout, setShowNotificationsPopout] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotificationsPopout(false);
      }
    };
    if (showNotificationsPopout) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotificationsPopout]);

  useEffect(() => {
    const loadUserData = () => {
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          if (parsed && parsed.username) setUser(parsed);
          else if (parsed && parsed.user && parsed.user.username) setUser(parsed.user);
          else setUser({ username: "User" });
        } catch {
          setUser({ username: "User" });
        }
      } else {
        setUser({ username: "User" });
      }
    };
    loadUserData();

    const handleProfileUpdate = (event: any) => {
      if (event.detail && event.detail.user) {
        setUser(event.detail.user);
      } else {
        loadUserData();
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Same icon per type as Notifications page (NotificationItem)
  const getNotificationIcon = (
    notificationType: 'task_due' | 'task_completed' | 'note_reminder' | 'study_reminder' | 'schedule_reminder' | 'general',
    type: 'info' | 'success' | 'warning' | 'error'
  ) => {
    const s = 16;
    switch (notificationType) {
      case 'task_completed':
        return { icon: <CheckCircle size={s} className="text-green-600 dark:text-green-400" />, bgColor: 'bg-green-100 dark:bg-green-900/20' };
      case 'task_due':
        return { icon: <AlertTriangle size={s} className="text-orange-600 dark:text-orange-400" />, bgColor: 'bg-orange-100 dark:bg-orange-900/20' };
      case 'note_reminder':
        return { icon: <FileText size={s} className="text-blue-600 dark:text-blue-400" />, bgColor: 'bg-blue-100 dark:bg-blue-900/20' };
      case 'study_reminder':
        return { icon: <BookOpen size={s} className="text-purple-600 dark:text-purple-400" />, bgColor: 'bg-purple-100 dark:bg-purple-900/20' };
      case 'schedule_reminder':
        return { icon: <Calendar size={s} className="text-indigo-600 dark:text-indigo-400" />, bgColor: 'bg-indigo-100 dark:bg-indigo-900/20' };
      default:
        switch (type) {
          case 'success':
            return { icon: <CheckCircle size={s} className="text-green-600 dark:text-green-400" />, bgColor: 'bg-green-100 dark:bg-green-900/20' };
          case 'warning':
            return { icon: <AlertTriangle size={s} className="text-yellow-600 dark:text-yellow-400" />, bgColor: 'bg-yellow-100 dark:bg-yellow-900/20' };
          case 'error':
            return { icon: <XCircle size={s} className="text-red-600 dark:text-red-400" />, bgColor: 'bg-red-100 dark:bg-red-900/20' };
          default:
            return { icon: <Info size={s} className="text-blue-600 dark:text-blue-400" />, bgColor: 'bg-blue-100 dark:bg-blue-900/20' };
        }
    }
  };

  // Handle global search shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get page title from route if not provided
  const getPageTitle = () => {
    if (pageTitle) return pageTitle;
    const routeTitles: { [key: string]: string } = {
      '/': 'Home',
      '/notes': 'Notebooks',
      '/notebooks': 'Notebooks',
      '/tasks': 'Tasks',
      '/decks': 'Flashcards',
      '/progress': 'Progress',
      '/chat': 'Messages',
      '/schedule': 'Schedule',
      '/study-timer': 'Study Timer',
      '/reviewer': 'Reviewer',
      '/notifications': 'Notifications',
      '/trash': 'Trash',
      '/settings': 'Settings',
      '/profile': 'Profile',
    };
    if (location.pathname.startsWith('/notes') || location.pathname.startsWith('/notebooks')) return 'Notebooks';
    return routeTitles[location.pathname] || 'ProdActivity';
  };

  return (
    <header 
      className={`fixed top-0 right-0 z-20 h-12 bg-white dark:bg-[#1c1c1c] border-b border-gray-200 dark:border-[#333333] transition-all duration-300 ${
        isCollapsed ? 'md:left-12' : 'md:left-44'
      } left-0`}
    >
      <div className="h-full flex items-center justify-between px-3 md:px-4">
        {/* Left: Menu Button & Page Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {/* Menu button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center justify-center p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-lg"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <Menu size={18} />
            </button>
            
            <h1 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {getPageTitle()}
            </h1>
            {pageDescription && (
              <span className="hidden md:inline text-xs text-gray-400">
                {pageDescription}
              </span>
            )}
          </div>
        </div>

          {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Search - compact */}
          <div className="hidden lg:flex items-center relative">
            <Search size={14} className="absolute left-2.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchModal(true)}
              onClick={() => setShowSearchModal(true)}
              readOnly
              className="pl-8 pr-3 py-1 w-40 text-xs border border-gray-300 dark:border-[#333333] rounded-md bg-gray-50 dark:bg-[#252525] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500 focus:border-transparent cursor-pointer"
            />
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Menu size={18} />
          </button>

          {/* Theme Toggle */}
          <HeaderTooltip label={theme === 'dark' ? 'Light' : 'Dark'}>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
            </button>
          </HeaderTooltip>

          {/* Notifications – popout */}
          <div className="relative flex items-center" ref={notificationsRef}>
            <HeaderTooltip label="Notifications">
              <button
                type="button"
                onClick={() => setShowNotificationsPopout((prev) => !prev)}
                className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Bell size={18} className="shrink-0" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1c1c1c]" />
                )}
              </button>
            </HeaderTooltip>
            {showNotificationsPopout && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={() => setShowNotificationsPopout(false)} />
                <div className="absolute right-0 top-full mt-1 w-80 max-h-[min(24rem,70vh)] flex flex-col rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] shadow-lg z-20 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-[#333333] shrink-0">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                        No notifications yet
                      </div>
                    ) : (
                      <ul className="py-1">
                        {notifications.slice(0, 8).map((n) => {
                          const iconData = getNotificationIcon(n.notificationType, n.type);
                          return (
                            <li key={n.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  markAsRead(n.id);
                                  setShowNotificationsPopout(false);
                                  navigate('/notifications');
                                }}
                                className={`w-full text-left px-3 py-2.5 flex gap-2 items-start hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors border-b border-gray-100 dark:border-[#333333] last:border-b-0 ${
                                  !n.isRead ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                                }`}
                              >
                                <div className={`shrink-0 p-1.5 rounded-md ${iconData.bgColor}`}>
                                  {iconData.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{n.title}</p>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{n.message}</p>
                                  <div className="flex items-center mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                    <Clock size={10} className="shrink-0 mr-1" />
                                    {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                                  </div>
                                </div>
                                <ChevronRight size={12} className="shrink-0 text-gray-400 mt-0.5" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="border-t border-gray-200 dark:border-[#333333] px-3 py-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotificationsPopout(false);
                        navigate('/notifications');
                      }}
                      className="w-full text-center text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 py-1.5"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Help */}
          <HeaderTooltip label="Help">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <HelpCircle size={18} className="shrink-0" />
            </button>
          </HeaderTooltip>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {(() => {
                const avatarUrl = getAvatarUrl(user?.avatar);
                return avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-500 text-white font-medium text-sm flex items-center justify-center">
                  {getInitials(user?.displayName || user?.username || "U")}
                </div>
              );
              })()}
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#252525] rounded-lg border border-gray-200 dark:border-[#333333] shadow z-20 py-1 min-w-0">
                  <div className="px-3 py-2.5 border-b border-gray-100 dark:border-[#333333]">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user?.displayName || user?.username || "User"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {user?.email || ""}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors text-left"
                  >
                    <User size={16} className="flex-shrink-0 text-gray-500 dark:text-gray-400" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors text-left"
                  >
                    <Settings size={16} className="flex-shrink-0 text-gray-500 dark:text-gray-400" />
                    Settings
                  </button>
                  <div className="border-t border-gray-100 dark:border-[#333333] my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <LogOut size={16} className="flex-shrink-0" />
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 dark:bg-black/60" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed top-14 left-0 right-0 bottom-0 bg-white dark:bg-[#1c1c1c] border-t border-gray-200 dark:border-[#333333] overflow-y-auto">
            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  navigate('/');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Home
              </button>
              <button
                onClick={() => {
                  navigate('/notebooks');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Notes
              </button>
              <button
                onClick={() => {
                  navigate('/tasks');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Tasks
              </button>
              <button
                onClick={() => {
                  navigate('/settings');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      <GlobalSearchModal 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
      />

      {/* Help Modal */}
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </header>
  );
};

export default Header;
