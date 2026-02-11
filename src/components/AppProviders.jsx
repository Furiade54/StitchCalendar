import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { FeedbackProvider } from '../context/FeedbackContext';

export const AppProviders = ({ children }) => {
  return (
    <FeedbackProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </FeedbackProvider>
  );
};
