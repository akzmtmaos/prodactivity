import React, { createContext, useContext, useState } from 'react';

interface NavbarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export const NavbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <NavbarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </NavbarContext.Provider>
  );
};

export const useNavbar = () => {
  const context = useContext(NavbarContext);
  if (context === undefined) {
    throw new Error('useNavbar must be used within a NavbarProvider');
  }
  return context;
}; 