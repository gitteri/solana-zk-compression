'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { ApiService } from '../services/apiService';

// APIContext: A React context for providing and consuming the API service throughout the application
const APIContext = createContext<ApiService | undefined>(undefined);

// ApiProvider: A component that wraps the application and provides the API service to all child components
// It instantiates the ApiService with the necessary configuration and makes it available via context
export const ApiProvider = ({ children }: { children: ReactNode }) => {
    const apiService = new ApiService(process.env.NEXT_PUBLIC_HELIUS_API_KEY || '');

    return (
        <APIContext.Provider value={apiService}>
            {children}
        </APIContext.Provider>
    );
};

// useApi: A custom hook that allows components to easily access the API service
// It ensures that the hook is used within an ApiProvider and throws an error if not
export const useApi = () => {
    const context = useContext(APIContext);
    if (!context) {
        throw new Error('useAPI must be used within an APIProvider');
    }

    return context;
};