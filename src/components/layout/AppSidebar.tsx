import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import HelpPanel from '@/components/help/HelpPanel';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useNotes, useStarredNotes, Note } from '@/hooks/useNotes';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarTrigger,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import TagManager from '@/components/tags/TagManager';

type ActiveView = 'home' | 'all' | 'starred' | 'tag' | 'note';

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
  activeView: ActiveView;
  isCreating?: boolean;
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
  activeView,
  isCreating,
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



  const recentNotes = notes?.slice(0, 10) || [];

  return (
    <Sidebar collapsible="icon">
      {/* Header */}
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
        {/* Quick Actions */}
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
                  onClick={onCreateNote}
                  tooltip={t('sidebar.new_note')}
                  disabled={isCreating}
                  className="gap-2"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {!collapsed && <span className="font-body text-sm">{t('sidebar.new_note')}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onViewAllNotes}
                  tooltip={t('sidebar.all_notes')}
                  className={cn('gap-2', activeView === 'all' && 'bg-accent')}
                >
                  <Inbox className="h-4 w-4" />
                  {!collapsed && (
                    <>
                      <span className="font-body text-sm font-medium">{t('sidebar.all_notes')}</span>
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

        {/* Tags Section with CRUD */}
        {!collapsed && (
          <SidebarGroup>
            <Collapsible open={tagsExpanded} onOpenChange={setTagsExpanded}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md transition-colors">
                  <div className="flex items-center gap-2 w-full">
                    {tagsExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <TagIcon className="h-3 w-3" />
                    <span className="font-body text-sm font-medium">{t('sidebar.tags')}</span>
                  </div>
                </SidebarGroupLabel>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <TagManager
                    selectedTagId={selectedTagId}
                    onSelectTag={onSelectTag}
                    collapsed={collapsed}
                  />
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Recent Notes Section */}
        {!collapsed && (
          <SidebarGroup className="flex-1">
            <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md transition-colors">
                  <div className="flex items-center gap-2 w-full">
                    {notesExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <FileText className="h-3 w-3" />
                    <span className="font-body text-sm font-medium">{t('sidebar.recent_notes')}</span>
                  </div>
                </SidebarGroupLabel>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <ScrollArea className="h-[200px]">
                    {loadingNotes ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : recentNotes.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-3 py-2">
                        {t('sidebar.no_notes')}
                      </p>
                    ) : (
                      <SidebarMenu>
                        {recentNotes.map(note => (
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
                  </ScrollArea>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
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
            <ProfileAvatar
              name={profile?.display_name || 'Workspace'}
              size={28}
              style={profile?.avatar_style || 'beam'}
              colors={profile?.avatar_colors}
            />
            <div className="flex-1 min-w-0">
              <p className="font-body text-xs font-medium truncate">
                {profile?.display_name || 'My Workspace'}
              </p>
              <p className="font-body text-xs text-muted-foreground truncate">
                Local Database
              </p>
            </div>
          </div>
        )}
        {collapsed && user && (
          <div className="flex justify-center py-2">
            <ProfileAvatar
              name={profile?.display_name || 'Workspace'}
              size={28}
              style={profile?.avatar_style || 'beam'}
              colors={profile?.avatar_colors}
            />
          </div>
        )}
      </SidebarFooter>

      {/* Help Panel Dialog */}
      <HelpPanel open={helpOpen} onOpenChange={setHelpOpen} />
    </Sidebar>
  );
}
