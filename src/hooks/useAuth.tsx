/**
 * Auth Hook - Uses DataAdapter for environment-aware authentication
 */

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDataAdapter } from '@/lib/data/DataProvider';
import type { User, Session } from '@/lib/data/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isOnboarded: boolean;
  onboard: (displayName: string) => Promise<{ error: Error | null }>;
  deleteWorkspace: () => Promise<{ error: Error | null }>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const adapter = useDataAdapter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  const checkOnboarding = async () => {
    try {
      const profile = await adapter.profile.get();
      setIsOnboarded(!!profile?.is_onboarded);
    } catch (err) {
      console.error("Failed to check onboarding:", err);
      setIsOnboarded(false);
    }
  };

  const refreshAuth = async () => {
    setLoading(true);
    const currentUser = await adapter.auth.getCurrentUser();
    setUser(currentUser);
    await checkOnboarding();
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = adapter.auth.onAuthStateChange(async (currentUser) => {
      setUser(currentUser);
      await checkOnboarding();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [adapter]);

  const onboard = async (displayName: string) => {
    try {
      await adapter.profile.update({ display_name: displayName, is_onboarded: true });
      setIsOnboarded(true);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const deleteWorkspace = async () => {
    // Cancel all queries and wait for connections to settle
    queryClient.cancelQueries();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = await adapter.auth.deleteAccount();
    if (!result.error) {
      queryClient.clear();
      
      // Clear localStorage data
      localStorage.removeItem('bloom_v1_writing_stats');
      localStorage.removeItem('bloom_v1_writing_prefs');
      localStorage.removeItem('bloom_v1_preferences');
      localStorage.removeItem('bloom_v1_onboarded');
      
      setIsOnboarded(false);
      setUser(null);
    }
    return result;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isOnboarded,
      onboard,
      deleteWorkspace,
      refreshAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
