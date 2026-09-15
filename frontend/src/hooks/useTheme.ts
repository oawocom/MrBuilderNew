import { createContext, useContext } from 'react';
import { Colors } from '../theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  colors: typeof Colors.light;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  colors: Colors.light,
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);
