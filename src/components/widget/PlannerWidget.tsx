import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, PlayCircle, SkipForward, Plus, Timer, ExternalLink, Pencil, FileText, ChevronRight, ArrowLeft, Minus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useActiveTimeBlock } from '@/hooks/useActiveTimeBlock';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDataAdapter } from '@/lib/data/DataProvider';
import { useCreateTarget, useUpdateTarget } from '@/hooks/usePlanning';
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { TargetStatus, Note } from '@/lib/data/types';
import { extractPlainText } from '@/components/editor/blockUtils';

const WIDGET_FULL_SIZE = { width: 280, height: 400 };
const WIDGET_MINIMIZED_SIZE = { width: 52, height: 52 };

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Circle,
  in_progress: PlayCircle,
  completed: CheckCircle2,
  skipped: SkipForward,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-muted-foreground/70',
  in_progress: 'text-amber-500',
  completed: 'text-emerald-500',
  skipped: 'text-muted-foreground/40',
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getBlockTypeColor(blockType: string): string {
  const colors: Record<string, string> = {
    focus_work: '#6366f1',
    writing: '#f43f5e',
    research: '#06b6d4',
    review: '#f59e0b',
    planning: '#8b5cf6',
    break: '#10b981',
    custom: '#71717a',
  };
  return colors[blockType] || '#71717a';
}

async function openMainWindow() {
  console.log('Opening main window...');
  try {
    const main = await WebviewWindow.getByLabel('main');
    console.log('Found main window:', !!main);
    if (main) {
      await main.show();
      console.log('Main window shown');
      await main.unminimize();
      console.log('Main window unminimized');
      await main.setFocus();
      console.log('Main window focused');
    } else {
      console.error('Main window not found');
    }
  } catch (e) {
    console.error('Failed to open main window:', e);
  }
}

async function openQuickCaptureWidget() {
  console.log('Opening quick capture widget...');
  try {
    const existing = await WebviewWindow.getByLabel('quick-capture');
    console.log('Existing quick capture window:', !!existing);
    if (existing) {
      await existing.show();
      console.log('Existing quick capture shown');
      await existing.setFocus();
      console.log('Existing quick capture focused');
      return;
    }
    console.log('Creating new quick capture window...');
    new WebviewWindow('quick-capture', {
      url: '/quick-capture',
      title: 'Quick Capture',
      width: 340,
      height: 220,
      resizable: false,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      center: true,
    });
    console.log('Quick capture window created');
  } catch (e) {
    console.error('Failed to open quick capture:', e);
  }
}


function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Helper to convert note content to plain text for widget display
function contentToPlainText(content: string | null): string {
  if (!content) return '';
  
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      // It's BlockNote JSON format - extract plain text
      return extractPlainText(parsed);
    }
  } catch {
    // Not JSON or parsing failed - treat as plain text
    return content;
  }
  
  return content;
}

export function PlannerWidget() {
  const { t } = useTranslation();
  const activeInfo = useActiveTimeBlock();
  const today = formatDateLocal(new Date());
  const adapter = useDataAdapter();
  const queryClient = useQueryClient();
  const [minimized, setMinimized] = useState(false);

  const toggleMinimize = useCallback(async () => {
    try {
      const win = getCurrentWebviewWindow();
      if (minimized) {
        // Restore to full size
        document.body.style.background = '';
        document.documentElement.style.background = '';
        await win.setSize(new (await import('@tauri-apps/api/dpi')).LogicalSize(WIDGET_FULL_SIZE.width, WIDGET_FULL_SIZE.height));
        setMinimized(false);
      } else {
        // Minimize to sakura ball — make body transparent so window is round
        document.body.style.background = 'transparent';
        document.documentElement.style.background = 'transparent';
        await win.setSize(new (await import('@tauri-apps/api/dpi')).LogicalSize(WIDGET_MINIMIZED_SIZE.width, WIDGET_MINIMIZED_SIZE.height));
        setMinimized(true);
      }
    } catch (e) {
      console.error('Failed to resize widget:', e);
      // Still toggle UI state even if resize fails
      setMinimized((prev) => !prev);
    }
  }, [minimized]);

  // Use refetchInterval to keep widget data in sync with main app
  const { data: plan } = useQuery({
    queryKey: ['daily-plan', today],
    queryFn: () => adapter.planning.getDailyPlanWithDetails(today),
    enabled: !!today,
    refetchInterval: 2000,
  });

  // Fetch recent notes for the notes section
  const { data: recentNotes } = useQuery({
    queryKey: ['notes'],
    queryFn: () => adapter.notes.getAll(),
    refetchInterval: 3000,
    select: (notes: Note[]) => notes
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5),
  });

  const updateTarget = useUpdateTarget();
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [newTargetTitle, setNewTargetTitle] = useState('');
  const createTarget = useCreateTarget();
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [creatingNote, setCreatingNote] = useState(false);
  // 'targets' or 'notes' tab
  const [activeTab, setActiveTab] = useState<'targets' | 'notes'>('targets');
  // Inline note editor state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStartDrag = async () => {
    try {
      await getCurrentWebviewWindow().startDragging();
    } catch {
      // Ignore drag errors
    }
  };

  const cycleStatus = (id: string, current: TargetStatus) => {
    const next: Record<TargetStatus, TargetStatus> = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'pending',
      skipped: 'pending',
    };
    updateTarget.mutate({ id, status: next[current] });
  };

  const handleAddTarget = async () => {
    if (!newTargetTitle.trim() || !plan) return;
    await createTarget.mutateAsync({
      daily_plan_id: plan.id,
      title: newTargetTitle.trim(),
      target_type: 'custom',
      priority: 'medium',
    });
    setNewTargetTitle('');
    setShowAddTarget(false);
  };

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() || creatingNote) return;
    setCreatingNote(true);
    try {
      const note = await adapter.notes.create({ title: newNoteTitle.trim(), content: '' });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setNewNoteTitle('');
      setShowNewNote(false);
      // Open inline editor
      setEditingNote(note);
      setEditTitle(note.title);
      setEditContent(''); // Empty content, no conversion needed
    } catch (e) {
      console.error('Failed to create note:', e);
    } finally {
      setCreatingNote(false);
    }
  };

  const openNoteInline = (note: Note) => {
    setEditingNote(note);
    setEditTitle(note.title);
    // Convert BlockNote JSON to plain text for widget textarea
    setEditContent(contentToPlainText(note.content));
  };

  const closeNoteEditor = () => {
    // Save before closing
    if (editingNote) {
      autoSaveNote(editingNote.id, editTitle, editContent);
    }
    setEditingNote(null);
    setEditTitle('');
    setEditContent('');
  };

  const autoSaveNote = async (id: string, title: string, content: string) => {
    try {
      await adapter.notes.update(id, { title, content });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    } catch (e) {
      console.error('Failed to save note:', e);
    }
  };

  const handleNoteContentChange = (value: string) => {
    setEditContent(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (editingNote) {
      saveTimerRef.current = setTimeout(() => {
        autoSaveNote(editingNote.id, editTitle, value);
      }, 800);
    }
  };

  const handleNoteTitleChange = (value: string) => {
    setEditTitle(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (editingNote) {
      saveTimerRef.current = setTimeout(() => {
        autoSaveNote(editingNote.id, value, editContent);
      }, 800);
    }
  };

  const completedCount = plan?.targets.filter(t => t.status === 'completed').length ?? 0;
  const totalCount = plan?.targets.length ?? 0;

  const urgencyClass = activeInfo.remainingSeconds < 60
    ? 'text-rose-500'
    : activeInfo.remainingSeconds < 300
      ? 'text-amber-500'
      : 'text-foreground';

  return (
    <AnimatePresence mode="wait">
      {minimized ? (
        /* ── Minimized: sakura ball ── */
        <motion.div
          key="minimized"
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.3 }}
          transition={{ type: 'spring', damping: 20, stiffness: 400 }}
          onMouseDown={handleStartDrag}
          className="h-screen w-screen flex items-center justify-center cursor-grab active:cursor-grabbing"
        >
          <motion.button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={toggleMinimize}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="relative w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 via-rose-300 to-pink-200 flex items-center justify-center border border-white/20"
            title="Expand Bloom"
          >
            <span className="text-lg select-none drop-shadow-sm">🌸</span>
            {/* Active indicator dot */}
            {activeInfo.isActive && (
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white/60"
              />
            )}
            {/* Badge: completed count */}
            {totalCount > 0 && (
              <div className="absolute -bottom-0.5 -right-0.5 min-w-[14px] h-[14px] bg-primary text-primary-foreground text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 border border-white/60">
                {completedCount}/{totalCount}
              </div>
            )}
          </motion.button>
        </motion.div>
      ) : (
        /* ── Full widget ── */
        <motion.div
          key="expanded"
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="h-screen w-screen bg-background/[0.97] backdrop-blur-2xl border border-border/40 rounded-xl overflow-hidden flex flex-col"
        >
      {/* Header: drag + branding + actions */}
      <div
        onMouseDown={handleStartDrag}
        className="flex items-center justify-between px-2.5 py-1.5 cursor-grab active:cursor-grabbing bg-muted/20 border-b border-border/20"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🌸</span>
          <span className="text-[11px] font-semibold text-foreground/80">Bloom</span>
        </div>
        <div className="flex items-center gap-0.5" onMouseDown={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); toggleMinimize(); }}
            className="p-1 rounded-md hover:bg-muted/60 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openQuickCaptureWidget(); }}
            className="p-1 rounded-md hover:bg-muted/60 transition-colors"
            title="Quick Capture"
          >
            <Pencil className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openMainWindow(); }}
            className="p-1 rounded-md hover:bg-muted/60 transition-colors"
            title="Open Bloom"
          >
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={async (e) => { e.stopPropagation(); try { await getCurrentWebviewWindow().close(); } catch { /* ignore */ } }}
            className="p-1 rounded-md hover:bg-destructive/20 transition-colors"
            title="Close Widget"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Active Timeblock — shown at top when active */}
      <AnimatePresence mode="wait">
        {activeInfo.isActive && activeInfo.block && (
          <motion.div
            key="active-block"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-2.5 py-2 bg-muted/10 border-b border-border/20">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                    style={{ backgroundColor: activeInfo.block.color || getBlockTypeColor(activeInfo.block.block_type) }}
                  />
                  <span className="text-[11px] font-medium truncate text-foreground/90">
                    {activeInfo.block.title || activeInfo.block.block_type.replace('_', ' ')}
                  </span>
                </div>
                <motion.span
                  key={Math.floor(activeInfo.remainingSeconds)}
                  initial={{ opacity: 0.6, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn('text-sm font-bold tabular-nums ml-2', urgencyClass)}
                >
                  {formatCountdown(activeInfo.remainingSeconds)}
                </motion.span>
              </div>
              <div className="h-1 bg-muted/60 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: activeInfo.block.color || getBlockTypeColor(activeInfo.block.block_type) }}
                  animate={{ width: `${activeInfo.progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-0.5 text-[9px] text-muted-foreground/60">
                <span>{activeInfo.block.start_time}</span>
                <span>{activeInfo.block.end_time}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab switcher */}
      <div className="flex border-b border-border/20">
        <button
          onClick={() => setActiveTab('targets')}
          className={cn(
            'flex-1 py-1 text-[10px] font-medium transition-colors',
            activeTab === 'targets'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground/70'
          )}
        >
          {t('planning.targets')}
          {totalCount > 0 && (
            <span className="ml-1 text-[9px] text-muted-foreground">{completedCount}/{totalCount}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={cn(
            'flex-1 py-1 text-[10px] font-medium transition-colors',
            activeTab === 'notes'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground/70'
          )}
        >
          Notes
          {recentNotes && recentNotes.length > 0 && (
            <span className="ml-1 text-[9px] text-muted-foreground">{recentNotes.length}</span>
          )}
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'targets' ? (
            <motion.div
              key="targets-tab"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-hidden flex flex-col min-h-0"
            >
              {/* Add target header */}
              <div className="px-2.5 pt-1.5 pb-0.5 flex items-center justify-end">
                <button
                  onClick={() => setShowAddTarget(!showAddTarget)}
                  className="p-0.5 rounded hover:bg-muted/50 transition-colors"
                >
                  <Plus className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>

              {/* Add target input */}
              <AnimatePresence>
                {showAddTarget && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-2.5 overflow-hidden"
                  >
                    <input
                      value={newTargetTitle}
                      onChange={(e) => setNewTargetTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTarget();
                        if (e.key === 'Escape') setShowAddTarget(false);
                      }}
                      placeholder="New target..."
                      autoFocus
                      className="w-full h-6 px-2 mb-1 text-[11px] rounded border border-input bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Target list */}
              <div className="flex-1 overflow-y-auto px-1.5 pb-1.5">
                <AnimatePresence>
                  {plan?.targets.map((target, idx) => {
                    const Icon = STATUS_ICONS[target.status] || Circle;
                    const color = STATUS_COLORS[target.status] || 'text-muted-foreground';
                    return (
                      <motion.div
                        key={target.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8, height: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => cycleStatus(target.id, target.status)}
                        className={cn(
                          'flex items-center gap-1.5 py-1 px-1.5 rounded-md cursor-pointer transition-all hover:bg-muted/40',
                          target.status === 'completed' && 'opacity-50',
                        )}
                      >
                        <motion.div whileTap={{ scale: 0.75 }}>
                          <Icon className={cn('w-3 h-3 shrink-0', color)} />
                        </motion.div>
                        <span className={cn(
                          'text-[11px] flex-1 truncate leading-tight',
                          target.status === 'completed' && 'line-through text-muted-foreground',
                        )}>
                          {target.title}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {(!plan || plan.targets.length === 0) && (
                  <div className="flex items-center justify-center py-4 text-[11px] text-muted-foreground/50">
                    No targets for today
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="notes-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-hidden flex flex-col min-h-0"
            >
              <AnimatePresence mode="wait">
                {editingNote ? (
                  <motion.div
                    key="note-editor"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.12 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    {/* Editor header */}
                    <div className="px-1.5 pt-1.5 pb-0.5 flex items-center gap-1">
                      <button
                        onClick={closeNoteEditor}
                        className="p-0.5 rounded hover:bg-muted/50 transition-colors"
                      >
                        <ArrowLeft className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <input
                        value={editTitle}
                        onChange={(e) => handleNoteTitleChange(e.target.value)}
                        className="flex-1 text-[11px] font-medium bg-transparent text-foreground focus:outline-none truncate"
                        placeholder="Note title..."
                      />
                      {savingNote && (
                        <span className="text-[8px] text-muted-foreground/50">saving...</span>
                      )}
                    </div>
                    {/* Editor body */}
                    <div className="flex-1 px-2.5 pb-1.5 min-h-0">
                      <textarea
                        value={editContent}
                        onChange={(e) => handleNoteContentChange(e.target.value)}
                        placeholder="Start writing..."
                        autoFocus
                        className="w-full h-full text-[11px] leading-relaxed bg-transparent text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="notes-list"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.12 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    {/* New note header */}
                    <div className="px-2.5 pt-1.5 pb-0.5 flex items-center justify-end">
                      <button
                        onClick={() => setShowNewNote(!showNewNote)}
                        className="p-0.5 rounded hover:bg-muted/50 transition-colors"
                      >
                        <Plus className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>

                    {/* New note input */}
                    <AnimatePresence>
                      {showNewNote && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-2.5 overflow-hidden"
                        >
                          <input
                            value={newNoteTitle}
                            onChange={(e) => setNewNoteTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateNote();
                              if (e.key === 'Escape') setShowNewNote(false);
                            }}
                            placeholder="Note title..."
                            autoFocus
                            className="w-full h-6 px-2 mb-1 text-[11px] rounded border border-input bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Notes list */}
                    <div className="flex-1 overflow-y-auto px-1.5 pb-1.5">
                      {recentNotes && recentNotes.length > 0 ? (
                        recentNotes.map((note, idx) => (
                          <motion.div
                            key={note.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            onClick={() => openNoteInline(note)}
                            className="flex items-center gap-1.5 py-1 px-1.5 rounded-md cursor-pointer transition-all hover:bg-muted/40 group"
                          >
                            <FileText className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] truncate leading-tight block text-foreground/90">
                                {note.title || 'Untitled'}
                              </span>
                              <span className="text-[9px] text-muted-foreground/50">
                                {formatTimeAgo(note.updated_at)}
                              </span>
                            </div>
                            <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </motion.div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center py-4 text-[11px] text-muted-foreground/50">
                          No notes yet
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer: next block or status */}
      <AnimatePresence mode="wait">
        {!activeInfo.isActive && activeInfo.nextBlock && (
          <motion.div
            key="next-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-2.5 py-1.5 border-t border-border/20 bg-muted/10"
          >
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Timer className="w-3 h-3 shrink-0" />
              <span className="truncate">
                Next: <span className="font-medium text-foreground/80">{activeInfo.nextBlock.title || activeInfo.nextBlock.block_type.replace('_', ' ')}</span> at {activeInfo.nextBlock.start_time}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
