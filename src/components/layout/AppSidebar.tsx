import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import HelpPanel from '@/components/help/HelpPanel';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useNotes, useStarredNotes } from '@/hooks/useNotes';
import { useTagsWithCounts } from '@/hooks/useTags';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Search,
  Star,
  FileText,
  Tag as TagIcon,
  Settings,
  Inbox,
  Archive,
  ChevronDown,
  ChevronRight,
  Loader2,
  Network,
  Home,
  HelpCircle,
  CalendarDays,
  X,
  MoreHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveTimeBlock } from '@/hooks/useActiveTimeBlock';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import TagManager from '@/components/tags/TagManager';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

type ActiveView = 'home' | 'all' | 'starred' | 'tag' | 'note' | 'planner';

interface AppSidebarProps {
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onOpenSearch: () => void;
  onOpenGraph: () => void;
  onOpenSettings: () => void;
  onOpenArchive: () => void;
  selectedTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
  onGoHome: () => void;
  onViewAllNotes: () => void;
  onViewStarred: () => void;
  onViewPlanner: () => void;
  activeView: ActiveView;
  isCreating?: boolean;
  flyoutPanel: null | 'tags' | 'recent';
  onSetFlyoutPanel: (p: null | 'tags' | 'recent') => void;
  notesSortBy: 'edited' | 'created' | 'title';
  onSetNotesSortBy: (v: 'edited' | 'created' | 'title') => void;
  tagsSortBy: 'name' | 'count';
  onSetTagsSortBy: (v: 'name' | 'count') => void;
  showCreateTag: boolean;
  onSetShowCreateTag: (v: boolean) => void;
}

export default function AppSidebar({
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onOpenSearch,
  onOpenGraph,
  onOpenSettings,
  onOpenArchive,
  selectedTagId,
  onSelectTag,
  onGoHome,
  onViewAllNotes,
  onViewStarred,
  onViewPlanner,
  activeView,
  isCreating,
  flyoutPanel,
  onSetFlyoutPanel,
  notesSortBy,
  onSetNotesSortBy,
  tagsSortBy,
  onSetTagsSortBy,
  showCreateTag,
  onSetShowCreateTag,
}: AppSidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const { data: notes, isLoading: loadingNotes } = useNotes();
  const { data: starredNotes } = useStarredNotes();

  const [notesExpanded, setNotesExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tagsMenuOpen, setTagsMenuOpen] = useState(false);
  const [notesMenuOpen, setNotesMenuOpen] = useState(false);
  const activeTimeBlock = useActiveTimeBlock();

  const sortedNotes = useMemo(() => {
    if (!notes) return [];
    const arr = [...notes];
    if (notesSortBy === 'edited') arr.sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));
    else if (notesSortBy === 'created') arr.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    else arr.sort((a, b) => a.title.localeCompare(b.title));
    return arr;
  }, [notes, notesSortBy]);
  const displayNotes = sortedNotes.slice(0, 10);

  const formatRemaining = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rm = m % 60;
      return `${h}h ${rm}m`;
    }
    return `${m}m`;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className={cn(
          'flex items-center gap-2 p-3',
          collapsed && 'justify-center'
        )}>
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 shrink-0">
            <span className="text-lg">🌸</span>
          </div>
          {!collapsed && (
            <span className="font-display font-semibold text-sm">Bloom</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onGoHome}
                  tooltip={t('sidebar.home')}
                  className={cn('gap-2', activeView === 'home' && 'bg-accent')}
                >
                  <Home className="h-4 w-4" />
                  {!collapsed && <span className="font-body text-sm font-medium">{t('sidebar.home')}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onOpenSearch}
                  tooltip={`${t('sidebar.search')} (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+'}K)`}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  {!collapsed && <span className="font-body text-sm">{t('sidebar.search')}</span>}
                  {!collapsed && (
                    <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                      {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+'}K
                    </kbd>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onViewAllNotes}
                  tooltip="Library"
                  className={cn('gap-2', activeView === 'all' && 'bg-accent')}
                >
                  <Inbox className="h-4 w-4" />
                  {!collapsed && (
                    <>
                      <span className="font-body text-sm font-medium">Library</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {notes?.length || 0}
                      </span>
                    </>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onViewStarred}
                  tooltip={t('sidebar.starred')}
                  className={cn('gap-2', activeView === 'starred' && 'bg-accent')}
                >
                  <Star className="h-4 w-4" />
                  {!collapsed && (
                    <>
                      <span className="font-body text-sm font-medium">{t('sidebar.starred')}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {starredNotes?.length || 0}
                      </span>
                    </>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onOpenArchive}
                  tooltip={t('sidebar.archive')}
                  className="gap-2"
                >
                  <Archive className="h-4 w-4" />
                  {!collapsed && <span className="font-body text-sm">{t('sidebar.archive')}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onViewPlanner}
                  tooltip={t('sidebar.daily_planner')}
                  className={cn('gap-2', activeView === 'planner' && 'bg-accent')}
                >
                  <CalendarDays className="h-4 w-4" />
                  {!collapsed && <span className="font-body text-sm font-medium">{t('sidebar.daily_planner')}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onOpenGraph}
                  tooltip={t('sidebar.graph_view')}
                  className="gap-2"
                >
                  <Network className="h-4 w-4" />
                  {!collapsed && <span className="font-body text-sm">{t('sidebar.graph_view')}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <SidebarGroup>
            <Collapsible open={tagsExpanded} onOpenChange={setTagsExpanded}>
              <div className="group flex items-center px-2 text-sidebar-foreground/70">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-1.5 flex-1 min-w-0 py-1.5 text-xs font-medium hover:text-sidebar-foreground transition-colors">
                    {tagsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <TagIcon className="h-3 w-3" />
                    <span className="font-body font-medium">{t('sidebar.tags')}</span>
                  </button>
                </CollapsibleTrigger>
                <div className={cn('flex items-center gap-0.5 transition-opacity', tagsMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                  <DropdownMenu open={tagsMenuOpen} onOpenChange={setTagsMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className={cn('h-5 w-5', tagsMenuOpen && 'bg-accent')} onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuLabel className="text-xs py-1">Sort by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={tagsSortBy} onValueChange={(v) => onSetTagsSortBy(v as 'name' | 'count')}>
                        <DropdownMenuRadioItem value="name" className="text-xs">Name</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="count" className="text-xs">Note count</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); onSetShowCreateTag(true); }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <TagManager
                    selectedTagId={selectedTagId}
                    onSelectTag={onSelectTag}
                    collapsed={collapsed}
                    maxVisible={5}
                    onViewMore={() => onSetFlyoutPanel('tags')}
                    forceShowCreate={showCreateTag}
                    onHideCreate={() => onSetShowCreateTag(false)}
                    sortBy={tagsSortBy}
                  />
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {!collapsed && (
          <SidebarGroup>
            <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
              <div className="group flex items-center px-2 text-sidebar-foreground/70">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-1.5 flex-1 min-w-0 py-1.5 text-xs font-medium hover:text-sidebar-foreground transition-colors">
                    {notesExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <FileText className="h-3 w-3" />
                    <span className="font-body font-medium">{t('sidebar.recent_notes')}</span>
                  </button>
                </CollapsibleTrigger>
                <div className={cn('flex items-center gap-0.5 transition-opacity', notesMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                  <DropdownMenu open={notesMenuOpen} onOpenChange={setNotesMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className={cn('h-5 w-5', notesMenuOpen && 'bg-accent')} onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel className="text-xs py-1">Sort by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={notesSortBy} onValueChange={(v) => onSetNotesSortBy(v as 'edited' | 'created' | 'title')}>
                        <DropdownMenuRadioItem value="edited" className="text-xs">Last edited</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="created" className="text-xs">Created</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="title" className="text-xs">Title</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); onCreateNote(); }}
                    disabled={isCreating}
                  >
                    {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <div>
                    {loadingNotes ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : displayNotes.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-3 py-2">
                        {t('sidebar.no_notes')}
                      </p>
                    ) : (
                      <SidebarMenu>
                        {displayNotes.map(note => (
                          <SidebarMenuItem key={note.id}>
                            <SidebarMenuButton
                              onClick={() => onSelectNote(note.id)}
                              className={cn(
                                'gap-2',
                                selectedNoteId === note.id && 'bg-accent'
                              )}
                            >
                              {note.is_starred ? (
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                              ) : (
                                <FileText className="h-3 w-3 shrink-0" />
                              )}
                              <span className="truncate text-sm">{note.title}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    )}
                    {sortedNotes.length > 10 && (
                      <button
                        onClick={() => onSetFlyoutPanel('recent')}
                        className="w-full text-left px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors mt-0.5"
                      >
                        +{sortedNotes.length - 10} more notes...
                      </button>
                    )}
                  </div>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setHelpOpen(true)}
              tooltip={t('sidebar.help')}
              className="gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              {!collapsed && <span className="font-body text-sm">{t('sidebar.help')}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onOpenSettings}
              tooltip={t('sidebar.settings')}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              {!collapsed && <span className="font-body text-sm">{t('sidebar.settings')}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>

        </SidebarMenu>

        {!collapsed && user && (
          <div className="px-3 py-2 flex items-center gap-2">
            <div className="relative shrink-0">
              <ProfileAvatar
                name={profile?.display_name || 'Workspace'}
                size={28}
                style={profile?.avatar_style || 'beam'}
                colors={profile?.avatar_colors}
              />
              {activeTimeBlock.isActive && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background bg-emerald-500 animate-pulse" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body text-xs font-medium truncate">
                {profile?.display_name || 'My Workspace'}
              </p>
              <AnimatePresence mode="wait">
                {activeTimeBlock.isActive && activeTimeBlock.block && (
                  <motion.p
                    key="active-block"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="font-body text-[11px] text-emerald-600 dark:text-emerald-400 truncate font-medium"
                  >
                    {activeTimeBlock.block.title || activeTimeBlock.block.block_type} · {formatRemaining(activeTimeBlock.remainingSeconds)} left
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
        {collapsed && user && (
          <div className="flex justify-center py-2">
            <div className="relative">
              <ProfileAvatar
                name={profile?.display_name || 'Workspace'}
                size={28}
                style={profile?.avatar_style || 'beam'}
                colors={profile?.avatar_colors}
              />
              {activeTimeBlock.isActive && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background bg-emerald-500 animate-pulse" />
              )}
            </div>
          </div>
        )}
      </SidebarFooter>

      <HelpPanel open={helpOpen} onOpenChange={setHelpOpen} />
    </Sidebar>
  );
}

interface SidebarFlyoutPanelProps {
  flyoutPanel: 'tags' | 'recent';
  onClose: () => void;
  notesSortBy: 'edited' | 'created' | 'title';
  onSetNotesSortBy: (v: 'edited' | 'created' | 'title') => void;
  tagsSortBy: 'name' | 'count';
  onSetTagsSortBy: (v: 'name' | 'count') => void;
  showCreateTag: boolean;
  onSetShowCreateTag: (v: boolean) => void;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  selectedTagId: string | null;
  onSelectTag: (id: string | null) => void;
  onViewAllNotes: () => void;
  onCreateNote: () => void;
  isCreating?: boolean;
}

export function SidebarFlyoutPanel({
  flyoutPanel,
  onClose,
  notesSortBy,
  onSetNotesSortBy,
  tagsSortBy,
  onSetTagsSortBy,
  showCreateTag,
  onSetShowCreateTag,
  selectedNoteId,
  onSelectNote,
  selectedTagId,
  onSelectTag,
  onViewAllNotes,
  onCreateNote,
  isCreating,
}: SidebarFlyoutPanelProps) {
  const { t } = useTranslation();
  const { data: notes, isLoading: loadingNotes } = useNotes();
  const { data: tags } = useTagsWithCounts();
  const [query, setQuery] = useState('');

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    const arr = [...notes];
    if (notesSortBy === 'edited') arr.sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));
    else if (notesSortBy === 'created') arr.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    else arr.sort((a, b) => a.title.localeCompare(b.title));
    if (!query.trim()) return arr;
    return arr.filter(n => n.title.toLowerCase().includes(query.toLowerCase()));
  }, [notes, notesSortBy, query]);

  const filteredTags = useMemo(() => {
    if (!tags) return [];
    if (!query.trim()) return tags;
    return tags.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));
  }, [tags, query]);

  return (
    <div className="h-full bg-sidebar border-l border-sidebar-border flex flex-col overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-2 border-b border-sidebar-border shrink-0">
        <span className="font-body text-xs font-semibold flex-1 px-1 truncate">
          {flyoutPanel === 'tags' ? t('sidebar.tags') : t('sidebar.recent_notes')}
        </span>
        {flyoutPanel === 'recent' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Sort">
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs py-1">Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={notesSortBy} onValueChange={(v) => onSetNotesSortBy(v as 'edited' | 'created' | 'title')}>
                <DropdownMenuRadioItem value="edited" className="text-xs">Last edited</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="created" className="text-xs">Created</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="title" className="text-xs">Title</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {flyoutPanel === 'tags' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Sort">
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel className="text-xs py-1">Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={tagsSortBy} onValueChange={(v) => onSetTagsSortBy(v as 'name' | 'count')}>
                <DropdownMenuRadioItem value="name" className="text-xs">Name</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="count" className="text-xs">Note count</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title={flyoutPanel === 'tags' ? 'New tag' : 'New note'}
          disabled={isCreating}
          onClick={() => {
            if (flyoutPanel === 'tags') onSetShowCreateTag(true);
            else onCreateNote();
          }}
        >
          {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" title="Close" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="px-2 py-1.5 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-1.5 px-2 h-7 rounded-md bg-muted/60">
          <Search className="h-3 w-3 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        {flyoutPanel === 'tags' ? (
          <div className="p-2">
            {showCreateTag && (
              <TagManager
                selectedTagId={selectedTagId}
                onSelectTag={(tagId) => { onSelectTag(tagId); onClose(); }}
                collapsed={false}
                maxVisible={0}
                forceShowCreate={showCreateTag}
                onHideCreate={() => onSetShowCreateTag(false)}
                sortBy={tagsSortBy}
              />
            )}
            {filteredTags.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-2">{query ? 'No matching tags' : t('sidebar.no_tags')}</p>
            ) : (
              <SidebarMenu>
                {filteredTags.map(tag => (
                  <SidebarMenuItem key={tag.id}>
                    <SidebarMenuButton
                      onClick={() => { onSelectTag(tag.id); onClose(); }}
                      className={cn('gap-2', selectedTagId === tag.id && 'bg-accent')}
                    >
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tag.color || '#94a3b8' }} />
                      <span className="truncate text-sm">{tag.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{tag.note_count}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </div>
        ) : (
          <div className="p-2">
            {loadingNotes ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-2">{query ? 'No matching notes' : t('sidebar.no_notes')}</p>
            ) : (
              <SidebarMenu>
                {filteredNotes.map(note => (
                  <SidebarMenuItem key={note.id}>
                    <SidebarMenuButton
                      onClick={() => { onSelectNote(note.id); onClose(); }}
                      className={cn('gap-2', selectedNoteId === note.id && 'bg-accent')}
                    >
                      {note.is_starred
                        ? <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                        : <FileText className="h-3 w-3 shrink-0" />}
                      <span className="truncate text-sm">{note.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </div>
        )}
      </ScrollArea>

      {flyoutPanel === 'recent' && (
        <div className="border-t border-sidebar-border shrink-0 p-2">
          <Button
            variant="ghost"
            className="w-full h-8 text-xs font-medium justify-center"
            onClick={onViewAllNotes}
          >
            Open in Library
          </Button>
        </div>
      )}
    </div>
  );
}

