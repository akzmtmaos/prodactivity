import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Settings, User, HelpCircle, LogOut, Moon, Sun, Menu } from 'lucide-react';
import { useNotificationsContext } from '../context/NotificationsContext';
import { useTheme } from '../context/ThemeContext';
import { useNavbar } from '../context/NavbarContext';
import GlobalSearchModal from './common/GlobalSearchModal';
import HelpModal from './common/HelpModal';
import HeaderTooltip from './common/HeaderTooltip';

interface HeaderProps {
  pageTitle?: string;
  pageDescription?: string;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, pageDescription }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotificationsContext();
  const { theme, setTheme } = useTheme();
  const { isCollapsed, setIsCollapsed } = useNavbar();
  const [user, setUser] = useState<any | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

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
    if (location.pathname.startsWith('/notes')) return 'Notebooks';
    return routeTitles[location.pathname] || 'ProdActivity';
  };

  return (
    <header 
      className={`fixed top-0 right-0 z-20 h-12 bg-white dark:bg-[#1c1c1c] border-b border-gray-200 dark:border-[#333333] transition-all duration-300 ${
        isCollapsed ? 'md:left-14' : 'md:left-48'
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
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </HeaderTooltip>

          {/* Notifications */}
          <HeaderTooltip label="Notifications">
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1c1c1c]"></span>
              )}
            </button>
          </HeaderTooltip>

          {/* Help */}
          <HeaderTooltip label="Help">
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <HelpCircle size={18} />
            </button>
          </HeaderTooltip>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-500 text-white font-medium text-sm flex items-center justify-center">
                  {getInitials(user?.displayName || user?.username || "U")}
                </div>
              )}
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
                  navigate('/notes');
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
