'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { ApiService } from '../services/apiService';

const APIContext = createContext<ApiService | undefined>(undefined);

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  // Instantiate the API service with the necessary configuration
  const apiService = new ApiService(process.env.HELIUS_API_KEY || '');

  return (
    <APIContext.Provider value={apiService}>
      {children}
    </APIContext.Provider>
  );
};

// Custom hook to use the API service
export const useApi = () => {
  const context = useContext(APIContext);
  if (!context) {
    throw new Error('useAPI must be used within an APIProvider');
  }
  return context;
};