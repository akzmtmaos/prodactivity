import React, { useEffect, useState } from 'react';
import { useNavbar } from '../context/NavbarContext';

interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  const { isCollapsed } = useNavbar();
  // Enable layout transitions only after first paint to avoid initial shift
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setIsLayoutReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <div className="relative w-full">
      <div className={`px-4 py-6 sm:px-6 lg:px-8 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'} md:pt-6 pt-20 pb-24 ${isLayoutReady ? 'transition-[margin] duration-300 ease-in-out' : ''}`}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout; 