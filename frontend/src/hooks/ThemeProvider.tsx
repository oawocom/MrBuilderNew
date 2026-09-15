import React, { useState, ReactNode } from 'react';
import { Colors } from '../theme';
import { ThemeContext } from './useTheme';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const toggle = () => setMode(prev => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ mode, colors: Colors[mode], toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};
