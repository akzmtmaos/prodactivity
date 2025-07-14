// frontend/src/components/Navbar.tsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Menu, X, Home, BarChart2, FileText, BookOpen, 
  CheckSquare, Calendar, Clock, Trash2, Bell, 
  Settings, LogOut, ChevronLeft, ChevronRight, Brain, Layers 
} from "lucide-react";
import { useNavbar } from "../context/NavbarContext";

interface NavbarProps {
  setIsAuthenticated?: (value: boolean | ((prevState: boolean) => boolean)) => void;
}

const Navbar = ({ setIsAuthenticated }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isCollapsed, setIsCollapsed } = useNavbar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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

  // Primary navigation items (most important)
  const primaryNavItems = [
    { path: "/", name: "Home", icon: <Home size={20} /> },
    { path: "/progress", name: "Progress", icon: <BarChart2 size={20} /> },
    { path: "/notes", name: "Notes", icon: <FileText size={20} /> },
    { path: "/decks", name: "Decks", icon: <Layers size={20} /> },
    { path: "/tasks", name: "Tasks", icon: <CheckSquare size={20} /> },
  ];

  // Secondary navigation items (less frequently used)
  const secondaryNavItems = [
    { path: "/reviewer", name: "Reviewer", icon: <Brain size={20} /> },
    { path: "/schedule", name: "Schedule", icon: <Calendar size={20} /> },
    { path: "/study-timer", name: "Study Timer", icon: <Clock size={20} /> },
    { path: "/notifications", name: "Notifications", icon: <Bell size={20} /> },
    { path: "/trash", name: "Trash", icon: <Trash2 size={20} /> },
    { path: "/settings", name: "Settings", icon: <Settings size={20} /> },
  ];

  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  return (
    <>
      {/* Vertical Navbar for Desktop */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 z-30 flex-col transition-all duration-300 bg-white dark:bg-gray-800 shadow-lg
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Collapse/Expand button for desktop */}
        <div className="flex justify-end p-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* App logo/name */}
        <div 
          className="flex items-center justify-center p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
          onClick={() => {
            if (isCollapsed) {
              setIsCollapsed(false);
            }
          }}
        >
          <span className={`text-xl font-bold text-indigo-600 dark:text-indigo-400 ${isCollapsed ? 'hidden' : ''}`}>
            ProdActivity
          </span>
          <span className={`text-2xl font-bold text-indigo-600 dark:text-indigo-400 ${!isCollapsed ? 'hidden' : ''}`}>P</span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <ul className="space-y-2">
            {allNavItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${location.pathname === item.path 
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200" 
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"}
                    ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <span>{item.icon}</span>
                  <span className={`ml-3 ${isCollapsed ? 'hidden' : 'inline'}`}>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={openLogoutModal}
            className={`flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut size={16} />
            <span className={`ml-2 ${isCollapsed ? 'hidden' : 'inline'}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              ProdActivity
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ease-in-out ${
        mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out ${
            mobileMenuOpen ? 'bg-opacity-50' : 'bg-opacity-0'
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />
        
        {/* Menu Panel */}
        <div className={`fixed top-0 right-0 w-80 h-full bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
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
                <X size={20} />
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
                    <li key={item.path}>
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
                    <li key={item.path}>
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
                        <span className="mr-3">{item.icon}</span>
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={openLogoutModal}
                className="flex items-center justify-center w-full px-4 py-3 text-base font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200 ease-in-out transform hover:scale-105"
                style={{
                  animationDelay: `${(primaryNavItems.length + secondaryNavItems.length) * 50}ms`,
                  animation: mobileMenuOpen ? 'slideInFromRight 0.3s ease-out forwards' : 'none'
                }}
              >
                <LogOut size={18} className="mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile (Primary items only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700">
        <nav className="flex justify-around items-center h-16 px-2">
          {primaryNavItems.map((item) => (
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
          ))}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full min-w-0 px-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <Menu size={20} className="mb-1" />
            <span className="text-xs font-medium text-center truncate">More</span>
          </button>
        </nav>
      </div>

      {/* Logout Confirmation Modal */}
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