import React from 'react';

const FloatingActionButton = ({ onClick }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button 
        onClick={onClick}
        className="flex items-center justify-center size-14 rounded-full bg-primary text-white shadow-lg shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </div>
  );
};

export default FloatingActionButton;
