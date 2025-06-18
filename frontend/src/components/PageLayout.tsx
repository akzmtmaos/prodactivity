import React from 'react';
import { useNavbar } from '../context/NavbarContext';

interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  const { isCollapsed } = useNavbar();

  return (
    <div className="relative w-full">
      <div className={`px-4 py-6 sm:px-6 lg:px-8 transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout; 