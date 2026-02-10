import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTagsWithCounts, useUpdateTag, useDeleteTag, useCreateTag, TAG_COLORS } from '@/hooks/useTags';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
}

export default function TagManager({ selectedTagId, onSelectTag, collapsed }: TagManagerProps) {
  const { t } = useTranslation();
  const { data: tagsWithCounts, isLoading } = useTagsWithCounts();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const createTag = useCreateTag();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);

  const handleStartEdit = (tag: { id: string; name: string; color: string | null }) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || TAG_COLORS[0]);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    
    await updateTag.mutateAsync({
      id: editingId,
      name: editName.trim(),
      color: editColor,
    });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
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
    });
    setNewName('');
    setNewColor(TAG_COLORS[0]);
    setShowCreate(false);
  };

  if (collapsed) return null;

  return (
    <div className="space-y-1">
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <ScrollArea className="max-h-[200px]">
            {tagsWithCounts?.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-2">
                {t('tags.no_tags')}
              </p>
            ) : (
              <div className="space-y-0.5">
                {tagsWithCounts?.map(tag => (
                  <div key={tag.id} className="group">
                    {editingId === tag.id ? (
                      <div className="flex items-center gap-1 px-2 py-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="h-5 w-5 rounded-full shrink-0 border-2 border-foreground/20"
                              style={{ backgroundColor: editColor }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="start">
                            <div className="flex flex-wrap gap-1.5 max-w-[160px]">
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
                          'flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover:bg-accent transition-colors',
                          selectedTagId === tag.id && 'bg-accent'
                        )}
                        onClick={() => onSelectTag(tag.id)}
                      >
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color || '#8B9A7C' }}
                        />
                        <span className="text-sm truncate flex-1">{tag.name}</span>
                        <span className="text-xs text-muted-foreground">{tag.noteCount}</span>
                        
                        {/* Action buttons - visible on hover */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(tag);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(tag.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Create new tag */}
          {showCreate ? (
            <div className="flex items-center gap-1 px-2 py-1 border-t mt-2 pt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="h-5 w-5 rounded-full shrink-0 border-2 border-foreground/20"
                    style={{ backgroundColor: newColor }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="flex flex-wrap gap-1.5 max-w-[160px]">
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
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-7 text-xs text-muted-foreground"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-3 w-3" />
              {t('tags.new_tag')}
            </Button>
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
