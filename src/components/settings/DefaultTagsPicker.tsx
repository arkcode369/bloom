import React from 'react';
import { useTags } from '@/hooks/useTags';
import { useProfile } from '@/hooks/useProfile';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DefaultTagsPicker() {
  const { data: tags, isLoading: tagsLoading } = useTags();
  const { profile, updateProfile, isLoading: profileLoading } = useProfile();

  const defaultTags = profile?.default_tags || [];
  const isLoading = tagsLoading || profileLoading;

  const handleToggleTag = async (tagId: string) => {
    const currentDefaults = defaultTags || [];
    const newDefaults = currentDefaults.includes(tagId)
      ? currentDefaults.filter(id => id !== tagId)
      : [...currentDefaults, tagId];

    try {
      await updateProfile.mutateAsync({ default_tags: newDefaults });
      toast.success('Default tags updated');
    } catch (error) {
      toast.error('Failed to update default tags');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tags || tags.length === 0) {
    return (
      <div className="text-center py-4">
        <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No tags yet. Create tags first to set defaults.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Selected tags will be automatically applied to new notes.
      </p>
      
      <div className="grid grid-cols-2 gap-2">
        {tags.map(tag => (
          <div
            key={tag.id}
            className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/30 transition-colors"
          >
            <Checkbox
              id={`default-tag-${tag.id}`}
              checked={defaultTags.includes(tag.id)}
              onCheckedChange={() => handleToggleTag(tag.id)}
              disabled={updateProfile.isPending}
            />
            <Label
              htmlFor={`default-tag-${tag.id}`}
              className="flex-1 flex items-center gap-2 cursor-pointer text-sm"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: tag.color || '#6366f1' }}
              />
              <span className="truncate">{tag.name}</span>
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
