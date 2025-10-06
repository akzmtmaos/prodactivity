import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';

const FloatingProfileButton: React.FC = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/profile')}
      className="fixed bottom-4 right-4 z-40 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg w-12 h-12 flex items-center justify-center"
      title="Open Profile"
    >
      <User size={20} />
    </button>
  );
};

export default FloatingProfileButton;


