// frontend/src/components/Navbar.tsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Menu, X, Home, BarChart2, FileText, BookOpen, 
  CheckSquare, Calendar, Clock, Trash2, Bell, 
  Settings, LogOut, ChevronLeft, ChevronRight 
} from "lucide-react";
import { useNavbar } from "../context/NavbarContext";

interface NavbarProps {
  setIsAuthenticated?: (value: boolean | ((prevState: boolean) => boolean)) => void;
}

const Navbar = ({ setIsAuthenticated }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isCollapsed, setIsCollapsed } = useNavbar();
  const [mobileOpen, setMobileOpen] = useState(false);
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
    // Update the auth state in parent component
    setIsAuthenticated && setIsAuthenticated(false);
    console.log("Navbar: Auth state set to false, redirecting to login");
    navigate("/login");
  };

  const navItems = [
    { path: "/", name: "Home", icon: <Home size={20} /> },
    { path: "/progress", name: "Progress", icon: <BarChart2 size={20} /> },
    { path: "/notes", name: "Notes", icon: <FileText size={20} /> },
    { path: "/decks", name: "Decks", icon: <BookOpen size={20} /> },
    { path: "/tasks", name: "Tasks", icon: <CheckSquare size={20} /> },
    { path: "/schedule", name: "Schedule", icon: <Calendar size={20} /> },
    { path: "/study-timer", name: "Study Timer", icon: <Clock size={20} /> },
    { path: "/trash", name: "Trash", icon: <Trash2 size={20} /> },
    { path: "/notifications", name: "Notifications", icon: <Bell size={20} /> },
    { path: "/settings", name: "Settings", icon: <Settings size={20} /> },
  ];

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
            setMobileOpen(false);
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
            {navItems.map((item) => (
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

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700">
        <nav className="flex flex-wrap justify-around items-center min-h-[5rem] py-2 px-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-1/4 h-16 text-[10px]
                ${location.pathname === item.path 
                  ? "text-indigo-600 dark:text-indigo-400" 
                  : "text-gray-600 dark:text-gray-400"}`}
            >
              <span className="mb-0.5">{item.icon}</span>
              <span className="text-center px-1 line-clamp-1">{item.name}</span>
            </Link>
          ))}
          <button
            onClick={openLogoutModal}
            className="flex flex-col items-center justify-center w-1/4 h-16 text-[10px] text-red-600 dark:text-red-400"
          >
            <LogOut size={16} className="mb-0.5" />
            <span className="line-clamp-1">Logout</span>
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