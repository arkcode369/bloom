import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTagsWithCounts, useUpdateTag, useDeleteTag, useCreateTag, TAG_COLORS, TAG_ICONS } from '@/hooks/useTags';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  Loader2,
  Tag as TagIcon,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TagManagerProps {
  selectedTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
  collapsed?: boolean;
  maxVisible?: number;
  onViewMore?: () => void;
  forceShowCreate?: boolean;
  onHideCreate?: () => void;
  sortBy?: 'name' | 'count';
}

export default function TagManager({ selectedTagId, onSelectTag, collapsed, maxVisible, onViewMore, forceShowCreate, onHideCreate, sortBy }: TagManagerProps) {
  const { t } = useTranslation();
  const { data: tagsWithCounts, isLoading } = useTagsWithCounts();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const createTag = useCreateTag();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [newIcon, setNewIcon] = useState<string | null>(null);

  const handleStartEdit = (tag: { id: string; name: string; color: string | null; icon?: string | null }) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || TAG_COLORS[0]);
    setEditIcon(tag.icon ?? null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    
    await updateTag.mutateAsync({
      id: editingId,
      name: editName.trim(),
      color: editColor,
      icon: editIcon,
    });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
    setEditIcon(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    
    await deleteTag.mutateAsync(deleteId);
    if (selectedTagId === deleteId) {
      onSelectTag(null);
    }
    setDeleteId(null);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    
    await createTag.mutateAsync({
      name: newName.trim(),
      color: newColor,
      icon: newIcon,
    });
    setNewName('');
    setNewColor(TAG_COLORS[0]);
    setNewIcon(null);
    setShowCreate(false);
  };

  useEffect(() => {
    if (forceShowCreate) {
      setShowCreate(true);
      onHideCreate?.();
    }
  }, [forceShowCreate]);

  const sortedTags = useMemo(() => {
    if (!tagsWithCounts) return [];
    const arr = [...tagsWithCounts];
    if (sortBy === 'count') arr.sort((a, b) => b.noteCount - a.noteCount);
    else arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [tagsWithCounts, sortBy]);

  const visibleTags = maxVisible ? sortedTags.slice(0, maxVisible) : sortedTags;
  const hiddenCount = maxVisible ? Math.max(0, sortedTags.length - maxVisible) : 0;

  if (collapsed) return null;

  return (
    <div className="space-y-1">
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div>
            {visibleTags?.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-2">
                {t('tags.no_tags')}
              </p>
            ) : (
              <div className="space-y-0.5">
                {visibleTags?.map(tag => (
                  <div key={tag.id} className="group">
                    {editingId === tag.id ? (
                      <div className="flex items-center gap-1 px-2 py-1">
                        {/* Color picker popover — edit */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="h-5 w-5 rounded-full shrink-0 border-2 border-foreground/20"
                              style={{ backgroundColor: editColor }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="start">
                            <div className="flex flex-wrap gap-1.5 max-w-[164px]">
                              {TAG_COLORS.map(color => (
                                <button
                                  key={color}
                                  onClick={() => setEditColor(color)}
                                  className={cn(
                                    'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                                    editColor === color ? 'border-foreground' : 'border-transparent'
                                  )}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40">
                              <span className="text-xs text-muted-foreground">Custom</span>
                              <input
                                type="color"
                                value={editColor}
                                onChange={e => setEditColor(e.target.value)}
                                className="h-6 w-8 cursor-pointer rounded border-0 p-0 bg-transparent"
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                        {/* Icon picker popover */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="h-6 w-6 rounded border border-border/50 text-sm flex items-center justify-center hover:bg-accent">
                              {editIcon || '🏷️'}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="start">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              <button
                                onClick={() => setEditIcon(null)}
                                className={cn('h-7 w-7 rounded text-xs border hover:bg-accent', !editIcon && 'bg-accent border-primary')}
                              >✕</button>
                              {TAG_ICONS.map(icon => (
                                <button
                                  key={icon}
                                  onClick={() => setEditIcon(icon)}
                                  className={cn('h-7 w-7 rounded text-base hover:bg-accent border', editIcon === icon && 'bg-accent border-primary')}
                                >{icon}</button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-6 text-xs flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={handleSaveEdit}
                          disabled={updateTag.isPending}
                        >
                          {updateTag.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover:bg-accent transition-colors relative overflow-hidden',
                          selectedTagId === tag.id && 'bg-accent'
                        )}
                        onClick={() => onSelectTag(tag.id)}
                      >
                        {tag.icon ? (
                          <span className="text-sm leading-none shrink-0">{tag.icon}</span>
                        ) : (
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: tag.color || '#8B9A7C' }}
                          />
                        )}
                        <span className="font-body text-sm truncate flex-1">{tag.name}</span>
                        <span className="font-body text-xs text-muted-foreground transition-all duration-300 ease-in-out group-hover:translate-x-[-48px]">
                          {tag.noteCount}
                        </span>
                        <div className="absolute right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out translate-x-12 group-hover:translate-x-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(tag);
                            }}
                          >
                            <Pencil className="h-2 w-2" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 shrink-0 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(tag.id);
                            }}
                          >
                            <Trash2 className="h-2 w-2" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {hiddenCount > 0 && onViewMore && (
              <button
                onClick={onViewMore}
                className="w-full text-left px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors mt-0.5"
              >
                +{hiddenCount} more tags...
              </button>
            )}
          </div>

          {/* Create new tag */}
          {showCreate && (
            <div className="flex items-center gap-1 px-2 py-1 border-t mt-2 pt-2">
              {/* Color picker popover — create */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="h-5 w-5 rounded-full shrink-0 border-2 border-foreground/20"
                    style={{ backgroundColor: newColor }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="flex flex-wrap gap-1.5 max-w-[164px]">
                    {TAG_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewColor(color)}
                        className={cn(
                          'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                          newColor === color ? 'border-foreground' : 'border-transparent'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">Custom</span>
                    <input
                      type="color"
                      value={newColor}
                      onChange={e => setNewColor(e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border-0 p-0 bg-transparent"
                    />
                  </div>
                </PopoverContent>
              </Popover>
              {/* Icon picker popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-6 w-6 rounded border border-border/50 text-sm flex items-center justify-center hover:bg-accent">
                    {newIcon || '🏷️'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    <button
                      onClick={() => setNewIcon(null)}
                      className={cn('h-7 w-7 rounded text-xs border hover:bg-accent', !newIcon && 'bg-accent border-primary')}
                    >✕</button>
                    {TAG_ICONS.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setNewIcon(icon)}
                        className={cn('h-7 w-7 rounded text-base hover:bg-accent border', newIcon === icon && 'bg-accent border-primary')}
                      >{icon}</button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('tags.new_tag')}
                className="h-6 text-xs flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setShowCreate(false);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCreate}
                disabled={!newName.trim() || createTag.isPending}
              >
                {createTag.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowCreate(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tags.delete_tag')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tags.delete_tag_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
