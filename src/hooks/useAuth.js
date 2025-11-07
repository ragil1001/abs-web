// src/hooks/useAuth.js
"use client";
import { useContext } from 'react';
import AuthContext from '@/context/AuthContext';

// Custom hook to use auth context with additional functionality
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default useAuth;