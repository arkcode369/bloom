import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTags, useCreateTag, useAddTagToNote, useRemoveTagFromNote, useNoteTags, TAG_COLORS } from '@/hooks/useTags';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tag, Plus, Check, Loader2 } from 'lucide-react';
import TagBadge from './TagBadge';

interface TagPickerProps {
  noteId: string;
  trigger?: React.ReactNode;
}

export default function TagPicker({ noteId, trigger }: TagPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const { data: allTags, isLoading: loadingTags } = useTags();
  const { data: noteTags, isLoading: loadingNoteTags } = useNoteTags(noteId);
  const createTag = useCreateTag();
  const addTagToNote = useAddTagToNote();
  const removeTagFromNote = useRemoveTagFromNote();

  const noteTagIds = new Set(noteTags?.map(nt => nt.tag_id) || []);

  const handleToggleTag = async (tagId: string) => {
    if (noteTagIds.has(tagId)) {
      removeTagFromNote.mutate({ noteId, tagId });
    } else {
      addTagToNote.mutate({ noteId, tagId });
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      const newTag = await createTag.mutateAsync({ 
        name: newTagName.trim(), 
        color: selectedColor 
      });
      addTagToNote.mutate({ noteId, tagId: newTag.id });
      setNewTagName('');
      setShowColorPicker(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const isLoading = loadingTags || loadingNoteTags;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5">
            <Tag className="h-4 w-4" />
            <span>{t('tags_picker.tags')}</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">{t('tags_picker.manage_tags')}</h4>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[200px]">
              <div className="p-2 space-y-1">
                {allTags?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('tags_picker.no_tags_yet')}
                  </p>
                ) : (
                  allTags?.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent transition-colors'
                      )}
                    >
                      <TagBadge tag={tag} size="sm" />
                      {noteTagIds.has(tag.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="border-t p-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder={t('tags_picker.new_tag_name')}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="h-8 w-8 rounded-md border shrink-0 transition-colors hover:border-primary"
                  style={{ backgroundColor: selectedColor }}
                  title={t('tags_picker.pick_color')}
                />
              </div>

              {showColorPicker && (
                <div className="flex flex-wrap gap-1.5">
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                        selectedColor === color ? 'border-foreground' : 'border-transparent'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}

              <Button
                size="sm"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || createTag.isPending}
                className="w-full h-8"
              >
                {createTag.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    {t('tags_picker.create_tag')}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
