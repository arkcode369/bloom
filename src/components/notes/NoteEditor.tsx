import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Note, useUpdateNote, useNotes, useCreateNote } from '@/hooks/useNotes';
import { useSyncLinks } from '@/hooks/useLinks';
import { usePreferences } from '@/hooks/usePreferences';
import { useGraphInteractions } from '@/hooks/useGraphInteractions';
import BlockNoteEditorComponent from '@/components/editor/BlockNoteEditor';
import BacklinksPanel from '@/components/notes/BacklinksPanel';
import NoteTags from '@/components/tags/NoteTags';
import NoteCover from '@/components/notes/NoteCover';
import { TableOfContentsContent } from '@/components/notes/TableOfContents';
import WritingStats from '@/components/notes/WritingStats';
import VersionHistoryPanel from '@/components/notes/VersionHistoryPanel';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { List, Star, Pin, PinOff, Download, Archive, Trash2, ArrowLeft, PanelRightOpen, PanelRightClose, Maximize2, Minimize2, Check, Loader2, ExternalLink, History, Clock } from 'lucide-react';
import { useTogglePin } from '@/hooks/useNotes';
import { useExportNote } from '@/hooks/useExport';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { extractWikilinksFromBlocks } from '@/components/editor/blockUtils';

interface NoteEditorProps {
  note: Note;
  onBack?: () => void;
  onToggleStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onNavigateToNote?: (noteId: string) => void;
}

export default function NoteEditor({
  note,
  onBack,
  onToggleStar,
  onArchive,
  onDelete,
  onNavigateToNote,
}: NoteEditorProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || '');
  const [coverImage, setCoverImage] = useState<string | null>(note.cover_image || null);
  const [showBacklinks, setShowBacklinks] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const titleRef = React.useRef<HTMLTextAreaElement>(null);

  const { data: allNotes } = useNotes();
  const updateNote = useUpdateNote();
  const togglePin = useTogglePin();
  const { exportAsMarkdown } = useExportNote();
  const createNote = useCreateNote();
  const syncLinks = useSyncLinks();
  const { logNoteAccess } = useGraphInteractions();
  const { preferences, updateEditorPreference } = usePreferences();
  const [isFullWidth, setIsFullWidth] = useState(preferences.editor.isFullWidth);

  // Reset local state when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || '');
    setCoverImage(note.cover_image || null);
    setHasUnsavedChanges(false);

    // Log note access for Hebbian learning
    logNoteAccess(note.id);
  }, [note.id, note.title, note.content, note.cover_image, logNoteAccess]);

  // Auto-resize title
  const adjustHeight = useCallback(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, []);

  useEffect(() => {
    adjustHeight();
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [adjustHeight, title]);

  // Sync full width preference
  useEffect(() => {
    setIsFullWidth(preferences.editor.isFullWidth);
  }, [preferences.editor.isFullWidth]);

  const handleCoverChange = async (url: string | null) => {
    setCoverImage(url);
    updateNote.mutate({
      id: note.id,
      cover_image: url,
    });
  };

  const handleSave = useCallback(() => {
    if (title !== note.title || content !== note.content) {
      updateNote.mutate({
        id: note.id,
        title,
        content,
      }, {
        onSuccess: () => {
          setHasUnsavedChanges(false);
          setLastSavedAt(new Date());
        },
      });

      // Sync wikilinks from block content
      if (allNotes && content) {
        try {
          const blocks = JSON.parse(content);
          if (Array.isArray(blocks)) {
            const wikilinkTitles = extractWikilinksFromBlocks(blocks);

            // Find matching notes
            const targetNotes = allNotes.filter(n =>
              wikilinkTitles.some(t => t.toLowerCase() === n.title.toLowerCase()) && n.id !== note.id
            );

            // Use syncLinks with the found targets
            syncLinks.mutate({
              noteId: note.id,
              content: wikilinkTitles.map(t => `[[${t}]]`).join(' '),
              allNotes,
            });
          }
        } catch {
          // Not JSON, try markdown sync
          syncLinks.mutate({
            noteId: note.id,
            content,
            allNotes,
          });
        }
      }
    }
  }, [note.id, note.title, note.content, title, content, updateNote, allNotes, syncLinks]);

  const [showHistory, setShowHistory] = useState(false);

  const handlePopOut = async () => {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const label = `note-${note.id.substring(0, 8)}`;

      const win = new WebviewWindow(label, {
        url: `/note/${note.id}`,
        title: note.title,
        width: 800,
        height: 600,
        decorations: true,
      });

      win.once('tauri://created', () => {
        toast.success(`Note opened in new window`);
      });

      win.once('tauri://error', (e) => {
        console.error('Error creating window:', e);
        // If error is because label already exists, we focus it
        toast.error('Could not open new window');
      });
    } catch (err) {
      console.error('Failed to open new window:', err);
      toast.error('Multi-window is only supported in the desktop app');
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handleTitleBlur = () => {
    if (title !== note.title) {
      updateNote.mutate({ id: note.id, title });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Focus the editor
      const editorEl = document.querySelector('.bn-editor [contenteditable]') as HTMLElement;
      editorEl?.focus();
    }
  };

  const handleWikilinkClick = useCallback(async (noteId: string | null, linkTitle: string) => {
    if (noteId) {
      // Navigate to existing note
      onNavigateToNote?.(noteId);
    } else {
      // Create new note from wikilink
      try {
        const newNote = await createNote.mutateAsync({
          title: linkTitle,
          content: '',
        });
        toast.success(`Created note: ${linkTitle}`);
        onNavigateToNote?.(newNote.id);
      } catch (error) {
        toast.error('Failed to create note');
      }
    }
  }, [onNavigateToNote, createNote]);

  const toggleFullWidth = () => {
    const newValue = !isFullWidth;
    setIsFullWidth(newValue);
    updateEditorPreference('isFullWidth', newValue);
  };

  return (
    <motion.div
      className="flex h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative border-r h-full">
        {/* Toolbar - FIXED HEADER (Does not scroll) */}
        <header className="h-14 border-b bg-background/95 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-50 shadow-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <NoteTags noteId={note.id} />
            <WritingStats noteId={note.id} content={content} className="hidden md:flex shrink-0" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2 shrink-0">
              {updateNote.isPending ? (
                <><Loader2 className="h-3 w-3 animate-spin" /><span>Saving...</span></>
              ) : hasUnsavedChanges ? (
                <span className="text-amber-500 font-medium">Unsaved</span>
              ) : lastSavedAt ? (
                <><Check className="h-3 w-3 text-primary" /><span>Saved</span></>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Table of Contents">
                  <List className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-0">
                <TableOfContentsContent content={content} onItemClick={() => { }} />
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullWidth}
              className="h-8 w-8"
              title={isFullWidth ? t('editor.narrow_width') : t('editor.full_width')}
            >
              {isFullWidth ? (
                <Minimize2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handlePopOut} className="h-8 w-8" title="Pop out in new window">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className={cn("h-8 w-8", showHistory && "bg-accent text-accent-foreground")}
              title="Version History"
            >
              <History className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBacklinks(!showBacklinks)}
              className={cn("h-8 w-8 hidden lg:flex", showBacklinks && "bg-accent text-accent-foreground")}
              title={showBacklinks ? t('editor.hide_backlinks') : t('editor.show_backlinks')}
            >
              {showBacklinks ? (
                <PanelRightClose className="h-4 w-4 text-muted-foreground" />
              ) : (
                <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleStar}
              className="h-8 w-8"
              title={note.is_starred ? t('notes.unstar') : t('notes.star')}
            >
              <Star className={cn('h-4 w-4', note.is_starred ? 'fill-primary text-primary' : 'text-muted-foreground')} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => togglePin.mutate({ id: note.id, is_pinned: !note.is_pinned })}
              className="h-8 w-8"
              title={note.is_pinned ? t('notes.unpin') : t('notes.pin')}
            >
              <Pin className={cn('h-4 w-4', note.is_pinned ? 'fill-sky-500 text-sky-500 -rotate-45' : 'text-muted-foreground')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => exportAsMarkdown(note)} className="h-8 w-8" title={t('editor.export_markdown')}>
              <Download className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onArchive} className="h-8 w-8">
              <Archive className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Scrollable content area */}
        <ScrollArea className="flex-1 bg-background selection:bg-primary/10">
          <AnimatePresence mode="wait">
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="pb-20"
            >
              {/* Cover Image */}
              <NoteCover coverImage={coverImage} onCoverChange={handleCoverChange} />

              {/* Title - Notion style */}
              <div className={cn(
                "mx-auto w-full transition-all duration-300",
                isFullWidth ? "max-w-full px-4 pr-16" : "max-w-3xl px-4"
              )}>
                <textarea
                  ref={titleRef}
                  value={title}
                  onChange={handleTitleChange}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  placeholder={t('editor.untitled')}
                  rows={1}
                  className="w-full text-4xl font-bold bg-transparent border-0 resize-none focus:outline-none focus:ring-0 py-6 placeholder:text-muted-foreground/40 whitespace-pre-wrap break-words"
                  style={{
                    overflow: 'hidden',
                    minHeight: '3.5rem',
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
              </div>

              {/* BlockNote Editor */}
              <div className="flex-1">
                <BlockNoteEditorComponent
                  noteId={note.id}
                  initialContent={content}
                  onChange={(c) => { setContent(c); setHasUnsavedChanges(true); }}
                  onSave={handleSave}
                  isSaving={updateNote.isPending}
                  notes={allNotes || []}
                  onWikilinkClick={handleWikilinkClick}
                  isFullWidth={isFullWidth}
                  autoSaveInterval={preferences.editor.autoSaveInterval}
                  fontSize={preferences.editor.fontSize}
                />

                {/* Editor hint for empty notes */}
                {!content && (
                  <div className={cn(
                    "mx-auto text-xs text-muted-foreground/60 px-4 -mt-4",
                    isFullWidth ? "max-w-full" : "max-w-3xl"
                  )}>
                    💡 Tip: {t('editor.tip_wikilink')}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </ScrollArea>
      </div>

      <AnimatePresence>
        {showBacklinks && (
          <motion.aside
            className="w-72 border-l bg-card hidden lg:flex flex-col shrink-0"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <BacklinksPanel
              noteId={note.id}
              onNavigate={(id) => onNavigateToNote?.(id)}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Version History Panel */}
      <AnimatePresence>
        {showHistory && (
          <VersionHistoryPanel
            noteId={note.id}
            onClose={() => setShowHistory(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
