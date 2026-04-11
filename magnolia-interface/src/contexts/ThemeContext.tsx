/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

type OSTheme = 'magnolia' | 'brat' | 'fruit';

interface ThemeContextType {
  theme: OSTheme;
  setTheme: (theme: OSTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<OSTheme>(() => {
    return (localStorage.getItem('magnolia-theme') as OSTheme) || 'magnolia';
  });

  const setTheme = (newTheme: OSTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('magnolia-theme', newTheme);
  };

  useEffect(() => {
    const body = document.body;
    body.classList.remove('theme-brat', 'theme-fruit', 'theme-magnolia');
    if (theme === 'magnolia') body.classList.add('theme-magnolia');
    if (theme === 'brat') body.classList.add('theme-brat');
    if (theme === 'fruit') body.classList.add('theme-fruit');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useOSTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useOSTheme must be used within a ThemeProvider');
  }
  return context;
};
