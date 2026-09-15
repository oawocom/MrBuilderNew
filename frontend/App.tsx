import React from 'react';
import { ThemeProvider } from './src/hooks/ThemeProvider';
import { RootNavigator } from './src/navigation/index';

export default function App() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}
