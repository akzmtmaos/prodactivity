// frontend/src/components/Navbar.tsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Menu, X, Home, BarChart2, FileText, BookOpen, 
  CheckSquare, Calendar, Clock, Trash2, Bell, 
  Settings, ChevronLeft, ChevronRight, Brain, Layers, MessageCircle, Search, Users
} from "lucide-react";
import axiosInstance from "../utils/axiosConfig";
import { getAvatarUrl } from "./chat/utils";
import { useNavbar } from "../context/NavbarContext";
import NotificationBadge from "./notifications/NotificationBadge";
import { useEffect, useRef } from "react";
import { useNotificationsContext } from "../context/NotificationsContext";

interface NavbarProps {
  setIsAuthenticated?: (value: boolean | ((prevState: boolean) => boolean)) => void;
}

const Navbar = ({ setIsAuthenticated }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isCollapsed, setIsCollapsed } = useNavbar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [findFriendsQuery, setFindFriendsQuery] = useState("");
  const [findFriendsResults, setFindFriendsResults] = useState<Array<{ id: string; username: string; avatar: string | null }>>([]);
  const [findFriendsSearching, setFindFriendsSearching] = useState(false);
  const [showFindFriendsPanel, setShowFindFriendsPanel] = useState(false);
  
  // Use the notifications context for real-time unread count
  const { unreadCount } = useNotificationsContext();
  
  // Log when unread count changes
  useEffect(() => {
    console.log('🔔 [Navbar] Unread count updated:', unreadCount);
  }, [unreadCount]);

  // Modified logout handler with proper TypeScript type
  const openLogoutModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent any default action
    setShowLogoutModal(true);
  };

  // Actual logout function when confirmed
  const confirmLogout = () => {
    console.log("Navbar: User logging out");
    localStorage.removeItem("user");
    setShowLogoutModal(false);
    setMobileMenuOpen(false);
    // Update the auth state in parent component
    setIsAuthenticated && setIsAuthenticated(false);
    console.log("Navbar: Auth state set to false, redirecting to login");
    navigate("/login");
  };

  // Removed old fetchNotifications logic - now using useNotifications hook with Supabase realtime

  useEffect(() => {
    // Fetch user info from localStorage
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

    // Load initial user data
    loadUserData();

    // Listen for profile updates from Settings page
    const handleProfileUpdate = (event: any) => {
      console.log('🔄 Navbar: Profile update detected', event.detail);
      if (event.detail && event.detail.user) {
        setUser(event.detail.user);
      } else {
        loadUserData(); // Fallback to reloading from localStorage
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, []);

  // Helper to get user initials
  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Find Friends search - debounced
  useEffect(() => {
    if (findFriendsQuery.trim().length < 2) {
      setFindFriendsResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setFindFriendsSearching(true);
        const response = await axiosInstance.get(`/search-users/?q=${encodeURIComponent(findFriendsQuery.trim())}`);
        const data = response.data;
        const users = (data.users || []).map((u: any) => ({
          id: String(u.id),
          username: u.username,
          avatar: getAvatarUrl(u.avatar)
        }));
        setFindFriendsResults(users);
      } catch {
        setFindFriendsResults([]);
      } finally {
        setFindFriendsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [findFriendsQuery]);

  const handleFindFriendsSelect = (_userId: string, username: string) => {
    setFindFriendsQuery("");
    setFindFriendsResults([]);
    setShowFindFriendsPanel(false);
    navigate(`/profile/${encodeURIComponent(username)}`);
  };

  // Primary navigation items (most important) - Find Friends is rendered separately above Messages on desktop
  const primaryNavItems = [
    { path: "/", name: "Home", icon: <Home size={18} /> },
    { path: "/chat", name: "Find Friends", icon: <Users size={18} />, isFindFriends: true },
    { path: "/chat", name: "Messages", icon: <MessageCircle size={18} /> },
    { path: "/progress", name: "Progress", icon: <BarChart2 size={18} /> },
    { path: "/notes", name: "Notebooks", icon: <FileText size={18} /> },
    { path: "/decks", name: "Flashcards", icon: <Layers size={18} /> },
    { path: "/tasks", name: "Tasks", icon: <CheckSquare size={18} /> },
  ];

  // Secondary navigation items (less frequently used)
  const secondaryNavItems = [
    { path: "/reviewer/r", name: "Reviewer", icon: <Brain size={18} /> },
    { path: "/schedule", name: "Schedule", icon: <Calendar size={18} /> },
    { path: "/study-timer", name: "Study Timer", icon: <Clock size={18} /> },
    { path: "/notifications", name: "Notifications", icon: <Bell size={18} /> },
    { path: "/trash", name: "Trash", icon: <Trash2 size={18} /> },
    { path: "/settings", name: "Settings", icon: <Settings size={18} /> },
  ];

  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  return (
    <>
      {/* Vertical Navbar for Desktop - Supabase Style */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 z-30 flex-col transition-[margin,width] duration-300 bg-white dark:bg-[#1c1c1c] border-r border-gray-200 dark:border-[#333333] h-screen
          ${isCollapsed ? 'w-14' : 'w-48'}
        `}
      >
        {/* App logo/name - Supabase style (bare P, no dark strip in light mode) */}
        <div 
          className="flex items-center justify-center h-12 px-0 border-b border-gray-200 dark:border-[#333333] cursor-pointer flex-shrink-0 bg-white dark:bg-[#1c1c1c]"
          onClick={() => {
            if (isCollapsed) {
              setIsCollapsed(false);
            }
            navigate('/');
          }}
          >
          <span className="text-lg font-semibold tracking-tight text-indigo-600 dark:text-indigo-400 leading-none">
            P
          </span>
        </div>

        {/* Navigation links - Supabase style */}
        <nav className="flex-1 overflow-y-auto py-3">
          {/* Primary Navigation - Find Friends & Messages above Progress */}
          <div className="px-2">
            <ul className="space-y-1">
              {/* Home */}
              <li>
                <Link
                  to="/"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all
                    ${location.pathname === '/' 
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}
                    ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? 'Home' : undefined}
                >
                  <span className={`flex-shrink-0 ${location.pathname === '/' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                    <Home size={18} />
                  </span>
                  {!isCollapsed && <span className="truncate">Home</span>}
                </Link>
              </li>
              {/* Find Friends - opens sliding panel */}
              <li>
                <button
                  onClick={() => setShowFindFriendsPanel(true)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800
                    ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? 'Find Friends' : undefined}
                >
                  <span className="flex-shrink-0">
                    <Users size={18} />
                  </span>
                  {!isCollapsed && <span className="truncate">Find Friends</span>}
                </button>
              </li>
              {/* Messages */}
              <li>
                <Link
                  to="/chat"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all
                    ${location.pathname === '/chat' 
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}
                    ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? 'Messages' : undefined}
                >
                  <span className={`flex-shrink-0 ${location.pathname === '/chat' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                    <MessageCircle size={18} />
                  </span>
                  {!isCollapsed && <span className="truncate">Messages</span>}
                </Link>
              </li>
              {/* Progress, Notebooks, Flashcards, Tasks */}
              {primaryNavItems.filter(item => item.path !== '/' && item.path !== '/chat' && !(item as any).isFindFriends).map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all
                        ${isActive 
                          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}
                        ${isCollapsed ? 'justify-center' : ''}`}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <span className={`flex-shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Divider */}
          {!isCollapsed && (
            <div className="px-4 py-2">
              <div className="h-px bg-gray-200 dark:bg-gray-800" />
            </div>
          )}

          {/* Secondary Navigation */}
          <div className="px-2 mt-2">
            <ul className="space-y-1">
              {secondaryNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all relative
                        ${isActive 
                          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}
                        ${isCollapsed ? 'justify-center' : ''}`}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <span className={`flex-shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                        {item.name === 'Notifications' ? (
                          <div className="relative">
                            <Bell size={18} />
                            {unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#1c1c1c]"></span>
                            )}
                          </div>
                        ) : (
                          item.icon
                        )}
                      </span>
                      {!isCollapsed && (
                        <span className="truncate flex-1">
                          {item.name}
                          {item.name === 'Notifications' && unreadCount > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

      </aside>


      {/* Mobile Menu Overlay */}
      <div className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ease-in-out ${
        mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 transition-opacity duration-300 ease-in-out ${
            mobileMenuOpen ? 'bg-black/40 dark:bg-black/60' : 'bg-transparent'
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />
        
        {/* Menu Panel */}
        <div className={`fixed top-0 right-0 w-80 h-full bg-white dark:bg-[#1c1c1c] shadow-xl transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                Menu
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto">
              {/* Primary Navigation */}
              <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Main
                </h3>
                <ul className="space-y-1">
                  {primaryNavItems.map((item, index) => (
                    <li key={(item as any).isFindFriends ? 'find-friends' : item.path}>
                      {(item as any).isFindFriends ? (
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setShowFindFriendsPanel(true);
                          }}
                          className="flex items-center w-full px-3 py-3 text-base font-medium rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animation: mobileMenuOpen ? 'slideInFromRight 0.3s ease-out forwards' : 'none'
                          }}
                        >
                          <span className="mr-3">{item.icon}</span>
                          {item.name}
                        </button>
                      ) : (
                        <Link
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center px-3 py-3 text-base font-medium rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105
                            ${location.pathname === item.path 
                              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200" 
                              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"}`}
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animation: mobileMenuOpen ? 'slideInFromRight 0.3s ease-out forwards' : 'none'
                          }}
                        >
                          <span className="mr-3">{item.icon}</span>
                          {item.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Secondary Navigation */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  More
                </h3>
                <ul className="space-y-1">
                  {secondaryNavItems.map((item, index) => (
                    <li key={item.path} className="relative">
                      <Link
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center px-3 py-3 text-base font-medium rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105
                          ${location.pathname === item.path 
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200" 
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"}`}
                        style={{
                          animationDelay: `${(index + primaryNavItems.length) * 50}ms`,
                          animation: mobileMenuOpen ? 'slideInFromRight 0.3s ease-out forwards' : 'none'
                        }}
                      >
                        {item.name === 'Notifications' ? (
                          <span className="flex items-center">
                            <NotificationBadge count={unreadCount} onClick={() => navigate('/notifications')} />
                            <span className="ml-3">{item.name}</span>
                          </span>
                        ) : (
                          <>
                            <span className="mr-3">{item.icon}</span>
                            {item.name}
                          </>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            {/* Profile / User Section */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="relative">
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center w-full px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-500 text-white font-bold text-lg">
                      {getInitials(user?.displayName || user?.username || "U")}
                    </span>
                  )}
                  <span className="ml-3 text-gray-800 dark:text-gray-200 font-medium">{user?.displayName || user?.username || "User"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile (Primary items only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#1c1c1c] shadow-lg border-t border-gray-200 dark:border-[#333333]">
        <nav className="flex justify-around items-center h-16 px-2">
          {primaryNavItems.map((item) =>
            (item as any).isFindFriends ? (
              <button
                key="find-friends"
                onClick={() => setShowFindFriendsPanel(true)}
                className="flex flex-col items-center justify-center flex-1 h-full min-w-0 px-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <span className="mb-1">{item.icon}</span>
                <span className="text-xs font-medium text-center truncate">{item.name}</span>
              </button>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full min-w-0 px-2
                  ${location.pathname === item.path 
                    ? "text-indigo-600 dark:text-indigo-400" 
                    : "text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"}`}
              >
                <span className="mb-1">{item.icon}</span>
                <span className="text-xs font-medium text-center truncate">{item.name}</span>
              </Link>
            )
          )}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full min-w-0 px-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <Menu size={18} className="mb-1" />
            <span className="text-xs font-medium text-center truncate">More</span>
          </button>
        </nav>
      </div>

      {/* Find Friends - Sliding Panel from Left */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ease-in-out ${showFindFriendsPanel ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop - neutral dark overlay, no blue tint */}
        <div 
          className="absolute inset-0 bg-black/40 dark:bg-black/60"
          onClick={() => setShowFindFriendsPanel(false)}
        />
        {/* Sliding Panel */}
        <div
          className={`fixed top-0 left-0 h-full w-80 sm:w-96 bg-white dark:bg-[#1e1e1e] shadow-xl transform transition-transform duration-300 ease-out z-50 border-r border-gray-200 dark:border-[#333333] ${
            showFindFriendsPanel ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#333333] flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Find Friends</h2>
              <button
                onClick={() => setShowFindFriendsPanel(false)}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-[#333333] flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={findFriendsQuery}
                  onChange={(e) => setFindFriendsQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-lg bg-gray-100 dark:bg-[#252525] border border-gray-200 dark:border-[#333333] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                  autoFocus
                />
                {findFriendsSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {findFriendsQuery.trim().length < 2 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                  Type at least 2 characters to search for friends
                </div>
              ) : findFriendsSearching ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">Searching...</div>
              ) : findFriendsResults.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">No users found</div>
              ) : (
                <div className="py-2">
                  {findFriendsResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleFindFriendsSelect(u.id, u.username)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-colors"
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">{u.username.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
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
                onClick={confirmLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;