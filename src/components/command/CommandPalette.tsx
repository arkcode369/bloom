import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotes, Note } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  FileText,
  Plus,
  Settings,
  Network,
  Star,
} from 'lucide-react';
import { format } from 'date-fns';
import { getContentPreview } from '@/components/editor/blockUtils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onOpenGraph: () => void;
  onOpenSettings: () => void;
}

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  group: 'actions' | 'notes' | 'navigation';
}

export default function CommandPalette({
  open,
  onOpenChange,
  onSelectNote,
  onCreateNote,
  onOpenGraph,
  onOpenSettings,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { data: notes } = useNotes();

  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const isMac = navigator.platform.includes('Mac');
  const modKey = isMac ? '⌘' : 'Ctrl+';



  const commands: Command[] = [
    {
      id: 'new-note',
      label: 'New Note',
      icon: <Plus className="h-4 w-4" />,
      shortcut: `${modKey}N`,
      action: () => {
        onCreateNote();
        onOpenChange(false);
      },
      group: 'actions',
    },
    {
      id: 'graph-view',
      label: 'Open Graph View',
      icon: <Network className="h-4 w-4" />,
      shortcut: `${modKey}G`,
      action: () => {
        onOpenGraph();
        onOpenChange(false);
      },
      group: 'actions',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-4 w-4" />,
      shortcut: `${modKey},`,
      action: () => {
        onOpenSettings();
        onOpenChange(false);
      },
      group: 'navigation',
    },
  ];

  const filteredNotes = notes?.filter(note =>
    note.title.toLowerCase().includes(search.toLowerCase()) ||
    getContentPreview(note.content, 500).toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8) || [];

  const actionCommands = commands.filter(c => c.group === 'actions');
  const navCommands = commands.filter(c => c.group === 'navigation');

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search notes, commands..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Actions">
          {actionCommands.map(command => (
            <CommandItem
              key={command.id}
              onSelect={command.action}
              className="gap-2"
            >
              {command.icon}
              <span>{command.label}</span>
              {command.shortcut && (
                <CommandShortcut>{command.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Notes */}
        {filteredNotes.length > 0 && (
          <>
            <CommandGroup heading="Notes">
              {filteredNotes.map(note => (
                <CommandItem
                  key={note.id}
                  onSelect={() => {
                    onSelectNote(note.id);
                    onOpenChange(false);
                  }}
                  className="gap-2"
                >
                  {note.is_starred ? (
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span className="flex-1 truncate">{note.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(note.updated_at), 'MMM d')}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {navCommands.map(command => (
            <CommandItem
              key={command.id}
              onSelect={command.action}
              className="gap-2"
            >
              {command.icon}
              <span>{command.label}</span>
              {command.shortcut && (
                <CommandShortcut>{command.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
