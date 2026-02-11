import { useState, useEffect } from 'react';

export const THEMES = [
  { id: 'default', name: 'Stitch Blue', color: '#136dec' },
  { id: 'nature', name: 'Nature Green', color: '#10b981' },
  { id: 'sunset', name: 'Sunset Orange', color: '#f97316' },
  { id: 'royal', name: 'Royal Purple', color: '#8b5cf6' },
  { id: 'berry', name: 'Berry Pink', color: '#ec4899' },
  { id: 'custom', name: 'Personalizado', color: null }
];

export const useTheme = () => {
  // Light/Dark Mode
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      return savedTheme || 'light';
    }
    return 'light';
  });

  // Color Theme
  const [colorTheme, setColorTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedColor = localStorage.getItem('colorTheme');
      return savedColor || 'default';
    }
    return 'default';
  });

  // Custom Color Value
  const [customColor, setCustomColor] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedCustomColor = localStorage.getItem('customColor');
      return savedCustomColor || '#136dec';
    }
    return '#136dec';
  });

  // Custom Background Color
  const [customBackgroundColor, setCustomBackgroundColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('customBackgroundColor') || '';
    }
    return '';
  });

  // Apply Light/Dark Mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply Color Theme
  useEffect(() => {
    const root = window.document.documentElement;
    const selectedTheme = THEMES.find(t => t.id === colorTheme) || THEMES[0];
    const colorToApply = selectedTheme.id === 'custom' ? customColor : selectedTheme.color;
    
    root.style.setProperty('--primary-color', colorToApply);
    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme, customColor]);

  // Apply Background Color
  useEffect(() => {
    const root = window.document.documentElement;
    if (customBackgroundColor) {
      // Override theme background variables
      root.style.setProperty('--color-background-light', customBackgroundColor);
      root.style.setProperty('--color-background-dark', customBackgroundColor);
      // Also set body background just in case
      document.body.style.backgroundColor = customBackgroundColor;
    } else {
      root.style.removeProperty('--color-background-light');
      root.style.removeProperty('--color-background-dark');
      document.body.style.backgroundColor = '';
    }
    localStorage.setItem('customBackgroundColor', customBackgroundColor);
  }, [customBackgroundColor]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const changeColorTheme = (themeId) => {
    setColorTheme(themeId);
  };

  const updateCustomColor = (color) => {
    setCustomColor(color);
    localStorage.setItem('customColor', color);
    if (colorTheme !== 'custom') {
      setColorTheme('custom');
    }
  };

  const updateCustomBackgroundColor = (color) => {
    setCustomBackgroundColor(color);
  };

  const resetCustomBackgroundColor = () => {
    setCustomBackgroundColor('');
  };

  return { 
    theme, 
    toggleTheme, 
    colorTheme, 
    changeColorTheme, 
    customColor, 
    updateCustomColor,
    customBackgroundColor,
    updateCustomBackgroundColor,
    resetCustomBackgroundColor
  };
};