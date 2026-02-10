import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, AvatarStyle } from '@/hooks/useProfile';
import ProfileAvatar, { AVATAR_STYLES, COLOR_PALETTES } from './ProfileAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Check, Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const DEFAULT_COLORS = ['#9DC08B', '#B4A7D6', '#F4A896', '#FCD34D', '#E8F5E9'];

export default function ProfileEditor() {
  const { profile, updateProfile, isLoading } = useProfile();
  
  const [displayName, setDisplayName] = useState('');
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('beam');
  const [avatarColors, setAvatarColors] = useState<string[]>(DEFAULT_COLORS);
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarStyle(profile.avatar_style);
      setAvatarColors(profile.avatar_colors);
      setBio(profile.bio || '');
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (!profile) return;
    
    const changed = 
      displayName !== (profile.display_name || '') ||
      avatarStyle !== profile.avatar_style ||
      JSON.stringify(avatarColors) !== JSON.stringify(profile.avatar_colors) ||
      bio !== (profile.bio || '');
    
    setHasChanges(changed);
  }, [displayName, avatarStyle, avatarColors, bio, profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({
        display_name: displayName || null,
        avatar_style: avatarStyle,
        avatar_colors: avatarColors,
        bio: bio || null,
      });
      toast.success('Profile updated! ✨');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const avatarName = displayName || 'User';
  const createdAt = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avatar Preview */}
      <div className="flex items-center gap-4">
        <motion.div
          key={`${avatarStyle}-${avatarColors.join('')}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <ProfileAvatar
            name={avatarName}
            size={80}
            style={avatarStyle}
            colors={avatarColors}
          />
        </motion.div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">
            {displayName || 'Workspace User'}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            Local Workspace
          </p>
          {createdAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Created on {createdAt}
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="profile-name">Display Name</Label>
        <Input
          id="profile-name"
          placeholder="Your display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="profile-bio">Bio</Label>
          <span className={cn(
            'text-xs',
            bio.length > 140 ? 'text-amber-500' : 'text-muted-foreground'
          )}>
            {bio.length}/160
          </span>
        </div>
        <Textarea
          id="profile-bio"
          placeholder="A short bio about yourself..."
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 160))}
          rows={2}
          className="resize-none"
        />
      </div>

      <Separator />

      {/* Avatar Selection Grid */}
      <div className="space-y-3">
        <Label>Choose Avatar</Label>
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {COLOR_PALETTES.map(({ name, colors }) => (
            <div key={name} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {colors.slice(0, 3).map((color, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{name}</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {AVATAR_STYLES.map(({ value, label }) => {
                  const isSelected = avatarStyle === value && JSON.stringify(avatarColors) === JSON.stringify(colors);
                  return (
                    <button
                      key={`${name}-${value}`}
                      onClick={() => {
                        setAvatarStyle(value);
                        setAvatarColors(colors);
                      }}
                      className={cn(
                        'relative p-1.5 rounded-lg border-2 transition-all hover:bg-muted/50',
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent'
                      )}
                      title={`${label} - ${name}`}
                    >
                      <ProfileAvatar
                        name={avatarName}
                        size={28}
                        style={value}
                        colors={colors}
                      />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : hasChanges ? (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
