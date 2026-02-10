import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import type { Tag } from '@/hooks/useTags';

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  onClick?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export default function TagBadge({ 
  tag, 
  onRemove, 
  onClick,
  size = 'sm',
  className,
}: TagBadgeProps) {
  const bgColor = tag.color || '#8B9A7C';
  
  // Calculate text color based on background brightness
  const getTextColor = (hexColor: string) => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? '#1a1a1a' : '#ffffff';
  };

  const textColor = getTextColor(bgColor);

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-all',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      style={{ 
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
