import React, { memo } from 'react';
import Avatar from 'boring-avatars';
import { cn } from '@/lib/utils';
import { AvatarStyle } from '@/hooks/useProfile';

interface ProfileAvatarProps {
  name: string;
  size?: number;
  style?: AvatarStyle;
  colors?: string[];
  className?: string;
  onClick?: () => void;
}

const DEFAULT_COLORS = ['#9DC08B', '#B4A7D6', '#F4A896', '#FCD34D', '#E8F5E9'];

const ProfileAvatar = memo(function ProfileAvatar({
  name,
  size = 40,
  style = 'beam',
  colors,
  className,
  onClick,
}: ProfileAvatarProps) {
  // Ensure colors is always a valid non-empty array
  const safeColors = colors && colors.length > 0 ? colors : DEFAULT_COLORS;
  
  return (
    <div 
      className={cn(
        'rounded-full overflow-hidden shrink-0',
        onClick && 'cursor-pointer hover:opacity-90 transition-opacity',
        className
      )}
      onClick={onClick}
      style={{ width: size, height: size }}
    >
      <Avatar
        size={size}
        name={name || 'User'}
        variant={style}
        colors={safeColors}
      />
    </div>
  );
});

export default ProfileAvatar;

// Export avatar style options for UI
export const AVATAR_STYLES: { value: AvatarStyle; label: string; description: string }[] = [
  { value: 'beam', label: 'Beam', description: 'Friendly face' },
  { value: 'marble', label: 'Marble', description: 'Abstract swirls' },
  { value: 'pixel', label: 'Pixel', description: 'Retro pixel art' },
  { value: 'sunset', label: 'Sunset', description: 'Warm gradients' },
  { value: 'ring', label: 'Ring', description: 'Concentric circles' },
  { value: 'bauhaus', label: 'Bauhaus', description: 'Geometric shapes' },
];

export const COLOR_PALETTES: { name: string; colors: string[] }[] = [
  { name: 'Garden', colors: ['#9DC08B', '#B4A7D6', '#F4A896', '#FCD34D', '#E8F5E9'] },
  { name: 'Sunset', colors: ['#FF6B6B', '#FFA07A', '#FFD93D', '#C9B1FF', '#6BCB77'] },
  { name: 'Ocean', colors: ['#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8', '#023E8A'] },
  { name: 'Forest', colors: ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2'] },
  { name: 'Candy', colors: ['#FF69B4', '#FFB6C1', '#DDA0DD', '#E6E6FA', '#FFF0F5'] },
  { name: 'Midnight', colors: ['#1A1A2E', '#16213E', '#0F3460', '#533483', '#E94560'] },
];
