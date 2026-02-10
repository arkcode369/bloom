import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  CheckSquare,
  Table,
} from 'lucide-react';

interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'h1',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 className="h-4 w-4" />,
    action: '# ',
  },
  {
    id: 'h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="h-4 w-4" />,
    action: '## ',
  },
  {
    id: 'h3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="h-4 w-4" />,
    action: '### ',
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    description: 'Create a bulleted list',
    icon: <List className="h-4 w-4" />,
    action: '- ',
  },
  {
    id: 'numbered',
    label: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListOrdered className="h-4 w-4" />,
    action: '1. ',
  },
  {
    id: 'todo',
    label: 'To-do List',
    description: 'Track tasks with checkboxes',
    icon: <CheckSquare className="h-4 w-4" />,
    action: '- [ ] ',
  },
  {
    id: 'quote',
    label: 'Quote',
    description: 'Add a blockquote',
    icon: <Quote className="h-4 w-4" />,
    action: '> ',
  },
  {
    id: 'code',
    label: 'Code Block',
    description: 'Add a code snippet',
    icon: <Code className="h-4 w-4" />,
    action: '```\n',
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Add a horizontal line',
    icon: <Minus className="h-4 w-4" />,
    action: '---\n',
  },
  {
    id: 'table',
    label: 'Table',
    description: 'Add a simple table',
    icon: <Table className="h-4 w-4" />,
    action: '| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Cell 1   | Cell 2   | Cell 3   |\n',
  },
];

interface SlashCommandMenuProps {
  position: { top: number; left: number } | null;
  searchText: string;
  onSelect: (action: string) => void;
  onClose: () => void;
}

export default function SlashCommandMenu({
  position,
  searchText,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = SLASH_COMMANDS.filter(
    cmd =>
      cmd.label.toLowerCase().includes(searchText.toLowerCase()) ||
      cmd.id.toLowerCase().includes(searchText.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchText]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!position) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => (i + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex].action);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [position, filteredCommands, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (position) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [position, onClose]);

  if (!position || filteredCommands.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border rounded-lg shadow-lg overflow-hidden w-64 max-h-80 overflow-y-auto animate-scale-in"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="p-1">
        {filteredCommands.map((cmd, index) => (
          <button
            key={cmd.id}
            onClick={() => onSelect(cmd.action)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-muted'
            )}
          >
            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              {cmd.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{cmd.label}</p>
              <p className="text-xs text-muted-foreground truncate">
                {cmd.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
