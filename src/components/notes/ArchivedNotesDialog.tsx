import React from 'react';
import { useTranslation } from 'react-i18next';
import { useArchivedNotes, useUnarchiveNote, useDeleteNote } from '@/hooks/useNotes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Archive, RotateCcw, Trash2, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface ArchivedNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ArchivedNotesDialog({ open, onOpenChange }: ArchivedNotesDialogProps) {
  const { t } = useTranslation();
  const { data: archivedNotes, isLoading } = useArchivedNotes();
  const unarchiveNote = useUnarchiveNote();
  const deleteNote = useDeleteNote();

  const handleUnarchive = (noteId: string) => {
    unarchiveNote.mutate(noteId);
  };

  const handleDelete = (noteId: string) => {
    deleteNote.mutate(noteId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            {t('notes.archived_notes')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and restore or permanently delete your archived notes.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : archivedNotes?.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t('notes.no_archived')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {archivedNotes?.map((note) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{note.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(note.updated_at), 'PP')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleUnarchive(note.id)}
                        disabled={unarchiveNote.isPending}
                        title={t('notes.restore_note')}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(note.id)}
                        disabled={deleteNote.isPending}
                        title={t('notes.delete_permanently')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
