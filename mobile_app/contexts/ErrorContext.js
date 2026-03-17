import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';

const ErrorContext = createContext();

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    return {
      handleError: (error, context) => {
        console.error(`[${context}] ${error.message}`, error);
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      },
      clearError: () => {},
      clearAllErrors: () => {},
      isLoading: false,
    };
  }
  return context;
};

export const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = (error, context = 'Unknown') => {
    const errorInfo = {
      id: Date.now().toString(),
      message: error.message || 'An unexpected error occurred',
      context,
      timestamp: new Date().toISOString(),
    };

    setErrors(prev => [errorInfo, ...prev]);

    // Show user-friendly alert
    Alert.alert('Error', error.message || 'An unexpected error occurred');

    // Log error for debugging
    console.error(`[${context}] ${error.message}`, error);
  };

  const clearError = (id) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  const clearAllErrors = () => {
    setErrors([]);
  };

  const value = {
    errors,
    isLoading,
    handleError,
    clearError,
    clearAllErrors,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};
