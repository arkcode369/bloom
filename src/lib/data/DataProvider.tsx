/**
 * Data Provider
 * 
 * React context that provides the SQLite data adapter for desktop.
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import type { DataAdapter, DataAdapterType } from './types';
import { createSQLiteAdapter } from '@/lib/data/sqlite-adapter';

interface DataContextValue {
  adapter: DataAdapter;
  adapterType: DataAdapterType;
  isDesktop: boolean;
  isWeb: boolean;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const contextValue = useMemo<DataContextValue>(() => {
    const adapterType: DataAdapterType = 'sqlite';
    const adapter = createSQLiteAdapter();

    return {
      adapter,
      adapterType,
      isDesktop: true,
      isWeb: false,
    };
  }, []);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

/**
 * Hook to access the data adapter
 */
export function useDataAdapter(): DataAdapter {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataAdapter must be used within a DataProvider');
  }
  return context.adapter;
}

/**
 * Hook to check the current environment
 */
export function useDataEnvironment(): Omit<DataContextValue, 'adapter'> {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataEnvironment must be used within a DataProvider');
  }
  const { adapter, ...rest } = context;
  return rest;
}

/**
 * Hook to get the full data context
 */
export function useDataContext(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
}
