import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Note, useToggleStar, useArchiveNote, useDeleteNote, useTogglePin } from '@/hooks/useNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Star,
  Pin,
  ArrowLeft,
  Plus,
  Tag as TagIcon,
  Inbox,
  Search,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  Archive,
  Trash2,
  X,
  Grid3X3,
  List,
  Clock,
  Calendar,
  Type,
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getContentPreview } from '@/components/editor/blockUtils';
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

export type ViewType = 'all' | 'starred' | 'tag';
type SortOption = 'updated' | 'created' | 'title';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';

interface NotesListViewProps {
  notes: Note[];
  title: string;
  icon: React.ReactNode;
  viewType: ViewType;
  tagName?: string;
  tagColor?: string;
  onSelectNote: (noteId: string) => void;
  onBack: () => void;
  onCreateNote?: () => void;
  onViewStarred?: () => void;
  onOpenArchive?: () => void;
  isLoading?: boolean;
}

export default function NotesListView({
  notes,
  title,
  icon,
  viewType,
  tagName,
  tagColor,
  onSelectNote,
  onBack,
  onCreateNote,
  onViewStarred,
  onOpenArchive,
  isLoading,
}: NotesListViewProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const toggleStar = useToggleStar();
  const togglePin = useTogglePin();
  const archiveNote = useArchiveNote();
  const deleteNote = useDeleteNote();

  const formatNoteDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return t('dates.today');
    if (isYesterday(date)) return t('dates.yesterday');
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const filteredAndSortedNotes = useMemo(() => {
    let result = [...notes];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(note =>
        note.title.toLowerCase().includes(query) ||
        getContentPreview(note.content, 500).toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated':
        default:
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [notes, searchQuery, sortBy, sortOrder]);

  const pinnedNotes = useMemo(() => filteredAndSortedNotes.filter(n => n.is_pinned), [filteredAndSortedNotes]);
  const otherNotes = useMemo(() => filteredAndSortedNotes.filter(n => !n.is_pinned), [filteredAndSortedNotes]);

  const isAllSelected = selectedIds.size === filteredAndSortedNotes.length && filteredAndSortedNotes.length > 0;
  const isSomeSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedNotes.map(n => n.id)));
    }
  };

  const toggleSelect = (noteId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(noteId)) {
      newSet.delete(noteId);
    } else {
      newSet.add(noteId);
    }
    setSelectedIds(newSet);
  };

  const handleBulkStar = () => {
    selectedIds.forEach(id => {
      const note = notes.find(n => n.id === id);
      if (note && !note.is_starred) toggleStar.mutate({ id, is_starred: true });
    });
    setSelectedIds(new Set());
  };

  const handleBulkUnstar = () => {
    selectedIds.forEach(id => {
      const note = notes.find(n => n.id === id);
      if (note && note.is_starred) toggleStar.mutate({ id, is_starred: false });
    });
    setSelectedIds(new Set());
  };

  const handleBulkPin = () => {
    selectedIds.forEach(id => {
      const note = notes.find(n => n.id === id);
      if (note && !note.is_pinned) togglePin.mutate({ id, is_pinned: true });
    });
    setSelectedIds(new Set());
  };

  const handleBulkUnpin = () => {
    selectedIds.forEach(id => {
      const note = notes.find(n => n.id === id);
      if (note && note.is_pinned) togglePin.mutate({ id, is_pinned: false });
    });
    setSelectedIds(new Set());
  };

  const handleBulkArchive = () => {
    selectedIds.forEach(id => archiveNote.mutate(id));
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => deleteNote.mutate(id));
    setSelectedIds(new Set());
    setShowDeleteDialog(false);
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.03 } } };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-5xl mx-auto px-6 py-8 lg:py-12">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {viewType === 'tag' && tagColor ? (
              <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${tagColor}20` }}>
                <TagIcon className="h-6 w-6" style={{ color: tagColor }} />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                {viewType === 'starred' ? <Star className="h-6 w-6 text-amber-500" /> : <Inbox className="h-6 w-6 text-primary" />}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">{title}</h1>
              <p className="text-sm text-muted-foreground">
                {filteredAndSortedNotes.length} note{filteredAndSortedNotes.length !== 1 ? 's' : ''}
              </p>
            </div>
            {onCreateNote && (
              <Button onClick={onCreateNote} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('list.new_note')}
              </Button>
            )}
          </div>
        </motion.div>

        {viewType === 'all' && (onViewStarred || onOpenArchive) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-4 flex gap-3">
            {onViewStarred && (
              <button
                onClick={onViewStarred}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-muted/60 hover:bg-muted border border-muted/80 hover:border-muted-foreground/20 transition-colors text-sm font-medium"
              >
                <Star className="h-4 w-4 text-amber-500" />
                Starred
              </button>
            )}
            {onOpenArchive && (
              <button
                onClick={onOpenArchive}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-muted/60 hover:bg-muted border border-muted/80 hover:border-muted-foreground/20 transition-colors text-sm font-medium"
              >
                <Archive className="h-4 w-4 text-muted-foreground" />
                Archive
              </button>
            )}
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <Card className="border-muted/50">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t('list.search_notes')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-muted/50 border-0" />
                  {searchQuery && (
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-[140px] bg-muted/50 border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updated"><div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" />{t('list.updated')}</div></SelectItem>
                      <SelectItem value="created"><div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{t('list.created')}</div></SelectItem>
                      <SelectItem value="title"><div className="flex items-center gap-2"><Type className="h-3.5 w-3.5" />{t('list.title')}</div></SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="h-9 w-9">
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                  <div className="flex items-center border rounded-md bg-muted/50">
                    <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="h-9 w-9 rounded-r-none"><List className="h-4 w-4" /></Button>
                    <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className="h-9 w-9 rounded-l-none"><Grid3X3 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {isSomeSelected && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="flex items-center gap-2 pt-3 mt-3 border-t">
                      <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} />
                      <span className="text-sm font-medium">{selectedIds.size} {t('list.selected')}</span>
                      <div className="flex-1" />
                      <Button variant="ghost" size="sm" onClick={handleBulkStar} className="gap-1"><Star className="h-4 w-4" />{t('list.star')}</Button>
                      <Button variant="ghost" size="sm" onClick={handleBulkPin} className="gap-1"><Pin className="h-4 w-4" />{t('notes.pin')}</Button>
                      <Button variant="ghost" size="sm" onClick={handleBulkArchive} className="gap-1"><Archive className="h-4 w-4" />{t('notes.archive')}</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowDeleteDialog(true)} className="gap-1 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" />{t('common.delete')}</Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}><X className="h-4 w-4" /></Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {isLoading ? (
            <div className={cn(viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2')}>
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className={cn("rounded-xl bg-muted/50 animate-pulse", viewMode === 'grid' ? 'h-32' : 'h-20')} />)}
            </div>
          ) : filteredAndSortedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h3 className="text-lg font-medium">{t('list.no_results')}</h3>
              <p className="text-sm text-muted-foreground">{t('list.no_notes_hint')}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {pinnedNotes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Pin className="h-4 w-4 text-sky-500 -rotate-45" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('notes.pinned')}</h2>
                  </div>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pinnedNotes.map(note => (
                        <NoteCard key={note.id} note={note} selected={selectedIds.has(note.id)} onClick={() => onSelectNote(note.id)} onToggleSelect={() => toggleSelect(note.id)} itemVariants={itemVariants} formatNoteDate={formatNoteDate} />
                      ))}
                    </div>
                  ) : (
                    <Card className="border-muted/50 overflow-hidden divide-y">
                      {pinnedNotes.map(note => (
                        <NoteListItem key={note.id} note={note} selected={selectedIds.has(note.id)} onClick={() => onSelectNote(note.id)} onToggleSelect={() => toggleSelect(note.id)} itemVariants={itemVariants} formatNoteDate={formatNoteDate} toggleStar={toggleStar} togglePin={togglePin} archiveNote={archiveNote} deleteNote={deleteNote} />
                      ))}
                    </Card>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {pinnedNotes.length > 0 && otherNotes.length > 0 && (
                  <div className="flex items-center gap-2 px-1 pt-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('sidebar.all_notes')}</h2>
                  </div>
                )}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {otherNotes.map(note => (
                      <NoteCard key={note.id} note={note} selected={selectedIds.has(note.id)} onClick={() => onSelectNote(note.id)} onToggleSelect={() => toggleSelect(note.id)} itemVariants={itemVariants} formatNoteDate={formatNoteDate} />
                    ))}
                  </div>
                ) : (
                  <Card className="border-muted/50 overflow-hidden divide-y">
                    {otherNotes.map(note => (
                      <NoteListItem key={note.id} note={note} selected={selectedIds.has(note.id)} onClick={() => onSelectNote(note.id)} onToggleSelect={() => toggleSelect(note.id)} itemVariants={itemVariants} formatNoteDate={formatNoteDate} toggleStar={toggleStar} togglePin={togglePin} archiveNote={archiveNote} deleteNote={deleteNote} />
                    ))}
                  </Card>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('list.delete_notes_title', { count: selectedIds.size })}</AlertDialogTitle>
            <AlertDialogDescription>{t('list.delete_notes_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common.delete')} {selectedIds.size}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NoteCard({ note, selected, onClick, onToggleSelect, itemVariants, formatNoteDate }: any) {
  const { t } = useTranslation();
  return (
    <motion.div variants={itemVariants}>
      <Card className={cn("group cursor-pointer transition-all hover:shadow-md hover:border-primary/30", selected && "border-primary bg-primary/5")} onClick={onClick}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5" onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
              <Checkbox checked={selected} className="opacity-0 group-hover:opacity-100 transition-opacity data-[state=checked]:opacity-100" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {note.is_pinned && <Pin className="h-3.5 w-3.5 text-sky-500 -rotate-45 shrink-0" />}
                {note.is_starred && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                <h3 className="font-medium truncate">{note.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{getContentPreview(note.content, 100) || t('list.no_content')}</p>
              <p className="text-xs text-muted-foreground">{formatNoteDate(note.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function NoteListItem({ note, selected, onClick, onToggleSelect, itemVariants, formatNoteDate, toggleStar, togglePin, archiveNote, deleteNote }: any) {
  const { t } = useTranslation();
  return (
    <motion.div variants={itemVariants} className={cn("group flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors cursor-pointer", selected && "bg-primary/5")} onClick={onClick}>
      <div onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
        <Checkbox checked={selected} className="opacity-0 group-hover:opacity-100 transition-opacity data-[state=checked]:opacity-100" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {note.is_pinned && <Pin className="h-4 w-4 text-sky-500 -rotate-45 shrink-0" />}
          {note.is_starred ? <Star className="h-4 w-4 text-amber-400 fill-amber-400 shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
          <h3 className="font-medium truncate">{note.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground truncate mt-0.5">{getContentPreview(note.content, 120) || t('list.no_content')}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-muted-foreground hidden sm:block">{formatNoteDate(note.updated_at)}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleStar.mutate({ id: note.id, is_starred: !note.is_starred }); }}><Star className={cn("h-4 w-4 mr-2", note.is_starred && "fill-amber-400 text-amber-400")} />{note.is_starred ? t('list.unstar') : t('list.star')}</DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePin.mutate({ id: note.id, is_pinned: !note.is_pinned }); }}><Pin className={cn("h-4 w-4 mr-2", note.is_pinned && "text-sky-500 fill-sky-500 -rotate-45")} />{note.is_pinned ? t('notes.unpin') : t('notes.pin')}</DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); archiveNote.mutate(note.id); toast.success(t('notes.archive')); }}><Archive className="h-4 w-4 mr-2" />{t('notes.archive')}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); deleteNote.mutate(note.id); toast.success(t('common.delete')); }}><Trash2 className="h-4 w-4 mr-2" />{t('common.delete')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
