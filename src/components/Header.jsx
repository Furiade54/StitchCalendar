import React from 'react';
import { useTheme } from '../hooks/useTheme';

const Header = ({ currentDate, onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between px-4 py-4 z-10 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md">
      <button 
        onClick={onMenuClick}
        className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <span className="material-symbols-outlined text-primary">menu</span>
      </button>
      <div className="flex flex-col items-center">
        <h1 className="text-lg font-bold tracking-tight capitalize text-primary">
          {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={toggleTheme}
          className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Cambiar tema"
          title="Cambiar tema"
        >
          <span className={`material-symbols-outlined text-primary transition-all duration-300 ${theme === 'dark' ? 'rotate-180' : 'rotate-0'}`}>
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        <button className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-primary">search</span>
        </button>
        <button className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-primary">notifications</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
