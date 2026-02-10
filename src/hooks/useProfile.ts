/**
 * Profile Hook - Uses DataAdapter for environment-aware data operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataAdapter } from '@/lib/data/DataProvider';
import type { Profile, ProfileUpdate, AvatarStyle } from '@/lib/data/types';

// Re-export types for backwards compatibility
export type { Profile, ProfileUpdate, AvatarStyle };

const DEFAULT_COLORS = ['#9DC08B', '#B4A7D6', '#F4A896', '#FCD34D', '#E8F5E9'];

const AVATAR_COLOR_PALETTES = {
  garden: ['#9DC08B', '#B4A7D6', '#F4A896', '#FCD34D', '#E8F5E9'],
  sunset: ['#FF6B6B', '#FFA07A', '#FFD93D', '#C9B1FF', '#6BCB77'],
  ocean: ['#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8', '#023E8A'],
  forest: ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2'],
  candy: ['#FF69B4', '#FFB6C1', '#DDA0DD', '#E6E6FA', '#FFF0F5'],
  midnight: ['#1A1A2E', '#16213E', '#0F3460', '#533483', '#E94560'],
};

export const useProfile = () => {
  const adapter = useDataAdapter();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<Profile | null> => {
      return adapter.profile.get();
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      return adapter.profile.update(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const completeOnboarding = useMutation({
    mutationFn: async (profileData: ProfileUpdate) => {
      return adapter.profile.completeOnboarding(profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    completeOnboarding,
    isOnboarded: profile?.is_onboarded ?? false,
    colorPalettes: AVATAR_COLOR_PALETTES,
    defaultColors: DEFAULT_COLORS,
  };
};
