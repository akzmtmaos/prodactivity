import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from './context/ThemeContext';
import { NavbarProvider } from './context/NavbarContext';
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Notes from "./pages/Notes";
import Tasks from "./pages/Tasks";
import Decks from "./pages/Decks";
import Progress from "./pages/Progress";
import Schedule from "./pages/Schedule";
import StudyTimer from "./pages/StudyTimer";
import Trash from "./pages/Trash";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DeckDetails from "./pages/DeckDetails";
import Reviewer from "./pages/Reviewer";

// Modified PrivateRoute component that adds layout for pages with navbar
interface PrivateRouteProps {
  isAuthenticated: boolean;
  children: React.ReactNode;
}

const PrivateRoute = ({ isAuthenticated, children }: PrivateRouteProps) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Navbar setIsAuthenticated={() => {}} />
      <main className="relative w-full transition-all duration-300 ease-in-out">
        {children}
      </main>
    </div>
  );
};

function App() {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    isLoading: boolean;
    checkedStorage: boolean;
  }>({
    isAuthenticated: false,
    isLoading: true,
    checkedStorage: false
  });

  // More stable authentication check that runs only once on initial load
  useEffect(() => {
    // Only run this once to prevent loops
    if (!authState.checkedStorage) {
      const userData = localStorage.getItem("user");
      console.log("App: Checking localStorage for user data");
      
      if (userData && userData !== "undefined") {
        try {
          // Parse the user data
          const parsed = JSON.parse(userData);
          if (parsed && typeof parsed === 'object' && parsed.username) {
            // Valid user found
            console.log("App: Valid user found in localStorage:", parsed.username);
            setAuthState({ 
              isAuthenticated: true, 
              isLoading: false, 
              checkedStorage: true 
            });
          } else {
            // Invalid user data
            console.log("App: Invalid user data (missing username)");
            localStorage.removeItem("user");
            setAuthState({ 
              isAuthenticated: false, 
              isLoading: false, 
              checkedStorage: true 
            });
          }
        } catch (e) {
          // Error parsing JSON
          console.error("App: Invalid user data in localStorage:", e);
          localStorage.removeItem("user");
          setAuthState({ 
            isAuthenticated: false, 
            isLoading: false, 
            checkedStorage: true 
          });
        }
      } else {
        // No user data
        console.log("App: No user data found in localStorage");
        setAuthState({ 
          isAuthenticated: false, 
          isLoading: false, 
          checkedStorage: true 
        });
      }
    }
  }, [authState.checkedStorage]);

  // Add listener for login events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        if (e.newValue) {
          try {
            const userData = JSON.parse(e.newValue);
            if (userData && userData.username) {
              console.log("Storage event: User logged in", userData.username);
              setAuthState(prev => ({ ...prev, isAuthenticated: true }));
            }
          } catch (error) {
            console.error("Error parsing user data from storage event", error);
          }
        } else {
          // User data was removed
          console.log("Storage event: User logged out");
          setAuthState(prev => ({ ...prev, isAuthenticated: false }));
        }
      }
    };

    // Listen for storage events (important for multi-tab functionality)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Global handler for login/logout - type compatible with Login component
  const handleSetAuthenticated = (value: boolean | ((prevState: boolean) => boolean)) => {
    setAuthState(prev => {
      const newIsAuthenticated = typeof value === 'function' ? value(prev.isAuthenticated) : value;
      
      // Add logging to track state changes
      console.log(`Authentication state changing from ${prev.isAuthenticated} to ${newIsAuthenticated}`);
      
      // If logging in, make sure user data exists in localStorage
      if (newIsAuthenticated && !localStorage.getItem("user")) {
        console.warn("Warning: Setting authenticated=true but no user in localStorage");
      }
      
      return { ...prev, isAuthenticated: newIsAuthenticated };
    });
  };

  // Show loading indicator while checking authentication
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <NavbarProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login setIsAuthenticated={handleSetAuthenticated} />} />
            <Route path="/register" element={<Register setIsAuthenticated={handleSetAuthenticated} />} />
            <Route
              path="/"
              element={
                <PrivateRoute isAuthenticated={authState.isAuthenticated}>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route
              path="/notes"
              element={
                <PrivateRoute isAuthenticated={authState.isAuthenticated}>
                  <Notes />
                </PrivateRoute>
              }
            />
            <Route
              path="/notes/:id"
              element={
                <PrivateRoute isAuthenticated={authState.isAuthenticated}>
                  <Notes />
                </PrivateRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <PrivateRoute isAuthenticated={authState.isAuthenticated}>
                  <Tasks />
                </PrivateRoute>
              }
            />
            <Route
              path="/decks"
              element={
                <PrivateRoute isAuthenticated={authState.isAuthenticated}>
                  <Decks />
                </PrivateRoute>
              }
            />
            <Route
              path="/decks/:id"
              element={
                <PrivateRoute isAuthenticated={authState.isAuthenticated}>
                  <DeckDetails />
                </PrivateRoute>
              }
            />
            <Route
              path="/study-timer"
              element={
                <PrivateRoute isAuthenticated={authState.isAuthenticated}>
                  <StudyTimer />
                </PrivateRoute>
              }
            />
            <Route
              path="/progress"
              element={
                <PrivateRoute isAuthenticated={authState.isAuthenticated}>
                  <Progress />
                </PrivateRoute>
              }
            />
            <Route
              path="/schedule"
              element={
                <PrivateRoute isAuthenticated={authState.isAuthenticated}>
                  <Schedule />
                </PrivateRoute>
              }
            />
            <Route
              path="/trash"
              element={
                <PrivateRoute isAuthenticated={authState.isAuthenticated}>
                  <Trash />
                </PrivateRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <PrivateRoute isAuthenticated={authState.isAuthenticated}>
                  <Notifications />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute isAuthenticated={authState.isAuthenticated}>
                  <Settings />
                </PrivateRoute>
              }
            />
            <Route
              path="/reviewer"
              element={
                <PrivateRoute isAuthenticated={authState.isAuthenticated}>
                  <Reviewer />
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </NavbarProvider>
    </ThemeProvider>
  );
}

export default App;