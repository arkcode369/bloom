import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import KnowledgeGraph from './KnowledgeGraph';

interface GraphDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNote: (noteId: string) => void;
  selectedNoteId?: string | null;
}

export default function GraphDialog({
  open,
  onOpenChange,
  onSelectNote,
  selectedNoteId,
}: GraphDialogProps) {
  const { t } = useTranslation();

  const handleSelectNote = (noteId: string) => {
    onSelectNote(noteId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>{t('graph.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            Interactive visualization of note connections and relationships.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 pb-6 px-6">
          <KnowledgeGraph
            onSelectNote={handleSelectNote}
            selectedNoteId={selectedNoteId}
            className="h-full w-full rounded-lg border"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
