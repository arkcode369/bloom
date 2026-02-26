import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from '@/components/ui/context-menu';
import {
  FilePlus,
  Home,
  FileText,
  Star,
  CalendarDays,
  Network,
  Search,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface AppContextMenuProps {
  children: React.ReactNode;
  onCreateNote: () => void;
  onGoHome: () => void;
  onViewAllNotes: () => void;
  onViewStarred: () => void;
  onViewPlanner: () => void;
  onOpenGraph: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export function AppContextMenu({
  children,
  onCreateNote,
  onGoHome,
  onViewAllNotes,
  onViewStarred,
  onViewPlanner,
  onOpenGraph,
  onOpenSearch,
  onOpenSettings,
  onOpenHelp,
}: AppContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="h-full w-full flex flex-col" onContextMenu={(e) => {
          // Allow native context menu inside contenteditable and input/textarea
          // so users can still cut/copy/paste text in the editor
          const target = e.target as HTMLElement;
          const isEditable =
            target.closest('[contenteditable="true"]') ||
            target.closest('input') ||
            target.closest('textarea');
          if (isEditable) {
            e.stopPropagation();
          }
        }}>
          {children}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        {/* Quick Actions */}
        <ContextMenuItem onClick={onCreateNote}>
          <FilePlus className="mr-2 h-4 w-4" />
          New Note
          <ContextMenuShortcut>Ctrl+N</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Navigation sub-menu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FileText className="mr-2 h-4 w-4" />
            View
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuItem onClick={onGoHome}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </ContextMenuItem>
            <ContextMenuItem onClick={onViewAllNotes}>
              <FileText className="mr-2 h-4 w-4" />
              All Notes
            </ContextMenuItem>
            <ContextMenuItem onClick={onViewStarred}>
              <Star className="mr-2 h-4 w-4 text-amber-500" />
              Starred
            </ContextMenuItem>
            <ContextMenuItem onClick={onViewPlanner}>
              <CalendarDays className="mr-2 h-4 w-4 text-blue-500" />
              Daily Planner
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        {/* Tools */}
        <ContextMenuItem onClick={onOpenGraph}>
          <Network className="mr-2 h-4 w-4 text-purple-500" />
          Knowledge Graph
          <ContextMenuShortcut>Ctrl+G</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onOpenSearch}>
          <Search className="mr-2 h-4 w-4" />
          Search Notes
          <ContextMenuShortcut>Ctrl+K</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* App */}
        <ContextMenuItem onClick={onOpenSettings}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
          <ContextMenuShortcut>Ctrl+,</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onOpenHelp}>
          <HelpCircle className="mr-2 h-4 w-4" />
          Help
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
