import React, { useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useProfile } from '@/hooks/useProfile';
import {
  useNotes,
  useCreateNote,
  useToggleStar,
  useArchiveNote,
  useDeleteNote,
  useStarredNotes,
} from '@/hooks/useNotes';
import { useNotesByTag, useTags } from '@/hooks/useTags';
import { useDialogs } from '@/hooks/useDialogs';
import { useViewNavigation } from '@/hooks/useViewNavigation';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/AppSidebar';
import NoteEditor from '@/components/notes/NoteEditor';
import NotesListView from '@/components/notes/NotesListView';
import SearchDialog from '@/components/search/SearchDialog';
import GraphDialog from '@/components/graph/GraphDialog';
import CommandPalette from '@/components/command/CommandPalette';
import SettingsDialog from '@/components/settings/SettingsDialog';
import ArchivedNotesDialog from '@/components/notes/ArchivedNotesDialog';
import FloatingQuickCapture from '@/components/FloatingQuickCapture';
import QuickCaptureModal from '@/components/command/QuickCaptureModal';
import HomePage from '@/components/home/HomePage';
import { DailyPlanner } from '@/components/calendar/DailyPlanner';
import { ErrorBoundary } from '@/components/calendar/ErrorBoundary';
import { DebugWrapper } from '@/components/calendar/DebugWrapper';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { usePreferences } from '@/hooks/usePreferences';
import { useWidgetWindow } from '@/hooks/useWidgetWindow';
import {
  FileText,
  Star,
  Inbox,
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

export default function Index() {
  const { profile, isLoading: profileLoading } = useProfile();
  const dialogs = useDialogs();
  const nav = useViewNavigation();

  const { data: notes, isLoading } = useNotes();
  const { data: starredNotes } = useStarredNotes();
  const { data: tagNotes } = useNotesByTag(nav.selectedTagId);
  const { data: allTags } = useTags();
  const createNote = useCreateNote();
  const toggleStar = useToggleStar();
  const archiveNote = useArchiveNote();
  const deleteNote = useDeleteNote();

  // Initialize widget window (auto show/hide based on active timeblock)
  useWidgetWindow();

  const selectedNote = notes?.find(n => n.id === nav.selectedNoteId);
  const selectedTag = allTags?.find(t => t.id === nav.selectedTagId);

  const handleCreateNote = useCallback(async (initialContent?: string) => {
    try {
      const now = new Date();
      const quickCaptureTitle = `Quick Capture (${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')})`;
      const newNote = await createNote.mutateAsync({
        title: initialContent ? quickCaptureTitle : 'Untitled',
        content: initialContent || '',
      });
      nav.setSelectedTagId(null);
      nav.setSelectedNoteId(newNote.id);
      nav.setViewMode('note');
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  }, [createNote, nav]);

  const { preferences } = usePreferences();

  useGlobalShortcuts(() => {
    dialogs.openQuickCapture();
  }, preferences.widget.quickCaptureAsWidget);

  // Listen for navigate-to-note events from widget windows
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<{ noteId: string }>('navigate-to-note', (event) => {
      const { noteId } = event.payload;
      if (noteId) {
        nav.setSelectedTagId(null);
        nav.setSelectedNoteId(noteId);
        nav.setViewMode('note');
      }
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [nav]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        dialogs.openCommandPalette();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        dialogs.openGraph();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateNote();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        dialogs.openSettings();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreateNote, dialogs]);

  const handleDeleteConfirm = () => {
    if (dialogs.deleteNoteId) {
      deleteNote.mutate(dialogs.deleteNoteId);
      if (nav.selectedNoteId === dialogs.deleteNoteId) {
        nav.setSelectedNoteId(null);
        nav.setViewMode('home');
      }
      dialogs.setDeleteNoteId(null);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar
          selectedNoteId={nav.selectedNoteId}
          onSelectNote={nav.handleSelectNote}
          onCreateNote={() => handleCreateNote()}
          onOpenSearch={dialogs.openCommandPalette}
          onOpenGraph={dialogs.openGraph}
          onOpenSettings={dialogs.openSettings}
          onOpenArchive={dialogs.openArchive}
          selectedTagId={nav.selectedTagId}
          onSelectTag={nav.handleSelectTag}
          onGoHome={nav.handleGoHome}
          onViewAllNotes={nav.handleViewAllNotes}
          onViewStarred={nav.handleViewStarred}
          onViewPlanner={() => {
            nav.setSelectedNoteId(null);
            nav.setSelectedTagId(null);
            nav.setViewMode('planner');
          }}
          activeView={nav.viewMode}
          isCreating={createNote.isPending}
        />

        <SidebarInset className="flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b px-4 lg:hidden bg-card">
            <SidebarTrigger className="mr-2" />
            <div className="flex items-center gap-2">
              <span className="text-xl">🌸</span>
              <span className="font-display font-semibold">Bloom</span>
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            {nav.viewMode === 'note' && selectedNote ? (
              <NoteEditor
                note={selectedNote}
                onBack={nav.handleGoHome}
                onToggleStar={() => toggleStar.mutate({
                  id: selectedNote.id,
                  is_starred: !selectedNote.is_starred
                })}
                onArchive={() => {
                  archiveNote.mutate(selectedNote.id);
                  nav.setSelectedNoteId(null);
                  nav.setViewMode('home');
                }}
                onDelete={() => dialogs.setDeleteNoteId(selectedNote.id)}
                onNavigateToNote={nav.handleSelectNote}
              />
            ) : nav.viewMode === 'all' ? (
              <NotesListView
                notes={notes || []}
                title="All Notes"
                icon={<Inbox className="h-4 w-4 text-primary" />}
                viewType="all"
                onSelectNote={nav.handleSelectNote}
                onBack={nav.handleGoHome}
                onCreateNote={() => handleCreateNote()}
                isLoading={isLoading}
              />
            ) : nav.viewMode === 'starred' ? (
              <NotesListView
                notes={starredNotes || []}
                title="Starred Notes"
                icon={<Star className="h-4 w-4 text-amber-500" />}
                viewType="starred"
                onSelectNote={nav.handleSelectNote}
                onBack={nav.handleGoHome}
                isLoading={false}
              />
            ) : nav.viewMode === 'tag' && nav.selectedTagId ? (
              <NotesListView
                notes={tagNotes || []}
                title={selectedTag?.name || 'Tagged Notes'}
                icon={<FileText className="h-4 w-4" />}
                viewType="tag"
                tagName={selectedTag?.name}
                tagColor={selectedTag?.color || undefined}
                onSelectNote={nav.handleSelectNote}
                onBack={nav.handleGoHome}
                onCreateNote={() => handleCreateNote()}
                isLoading={false}
              />
            ) : nav.viewMode === 'planner' ? (
              <ErrorBoundary>
                <DebugWrapper>
                  <DailyPlanner />
                </DebugWrapper>
              </ErrorBoundary>
            ) : (
              <HomePage
                onCreateNote={() => handleCreateNote()}
                onOpenGraph={dialogs.openGraph}
                onSelectNote={nav.handleSelectNote}
                onSelectTag={nav.handleSelectTag}
                isCreating={createNote.isPending}
              />
            )}
          </div>
        </SidebarInset>

        <AlertDialog open={!!dialogs.deleteNoteId} onOpenChange={() => dialogs.setDeleteNoteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete note?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the note.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <SearchDialog
          open={dialogs.showSearchDialog}
          onOpenChange={dialogs.setShowSearchDialog}
          onSelectNote={nav.handleSelectNote}
          recentNotes={notes || []}
        />

        <GraphDialog
          open={dialogs.showGraphDialog}
          onOpenChange={dialogs.setShowGraphDialog}
          onSelectNote={nav.handleSelectNote}
          selectedNoteId={nav.selectedNoteId}
        />

        <CommandPalette
          open={dialogs.showCommandPalette}
          onOpenChange={dialogs.setShowCommandPalette}
          onSelectNote={nav.handleSelectNote}
          onCreateNote={() => handleCreateNote()}
          onOpenGraph={dialogs.openGraph}
          onOpenSettings={dialogs.openSettings}
        />

        <SettingsDialog
          open={dialogs.showSettings}
          onOpenChange={dialogs.setShowSettings}
        />

        <ArchivedNotesDialog
          open={dialogs.showArchive}
          onOpenChange={dialogs.setShowArchive}
        />

        <FloatingQuickCapture
          onCapture={handleCreateNote}
          isCreating={createNote.isPending}
        />

        <QuickCaptureModal
          isOpen={dialogs.showQuickCapture}
          onClose={() => dialogs.setShowQuickCapture(false)}
          onCapture={handleCreateNote}
          isCreating={createNote.isPending}
        />
      </div>
    </SidebarProvider>
  );
}
