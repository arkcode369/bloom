import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Quote,
  Link2 as LinkIcon,
  Eye,
  Edit3,
  Columns,
  Check,
  Loader2
} from 'lucide-react';
import WikilinkAutocomplete from './WikilinkAutocomplete';
import WikilinkRenderer from '@/components/notes/WikilinkRenderer';
import SlashCommandMenu from './SlashCommandMenu';
import type { Note } from '@/hooks/useNotes';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  placeholder?: string;
  className?: string;
  notes?: Note[];
  onWikilinkClick?: (noteId: string | null, title: string) => void;
  currentNoteId?: string;
  defaultViewMode?: ViewMode;
  spellCheck?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
}

type ViewMode = 'edit' | 'preview' | 'split';

export default function MarkdownEditor({
  content,
  onChange,
  onSave,
  isSaving = false,
  autoSave = true,
  autoSaveInterval = 1,
  placeholder = 'Start writing...',
  className,
  notes = [],
  onWikilinkClick,
  currentNoteId,
  defaultViewMode = 'split',
  spellCheck = true,
  fontSize = 'medium',
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Wikilink autocomplete state
  const [autocompletePos, setAutocompletePos] = useState<{ top: number; left: number } | null>(null);
  const [autocompleteSearch, setAutocompleteSearch] = useState('');

  // Slash command state
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [slashSearch, setSlashSearch] = useState('');

  const fontSizeClass = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  }[fontSize];

  // Auto-save with debounce
  useEffect(() => {
    if (!autoSave || !onSave) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      onSave();
      setLastSaved(new Date());
    }, autoSaveInterval * 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, autoSave, onSave, autoSaveInterval]);

  const insertMarkdown = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const newContent =
      content.substring(0, start) +
      before + selectedText + after +
      content.substring(end);

    onChange(newContent);

    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content, onChange]);

  // Handle keyboard shortcuts in editor (Ctrl+B, Ctrl+I, etc.)
  useEffect(() => {
    const handleEditorKeyDown = (e: KeyboardEvent) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Only handle if textarea is focused
      if (document.activeElement !== textarea) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        e.stopPropagation();
        insertMarkdown('**', '**');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        e.stopPropagation();
        insertMarkdown('*', '*');
      }
    };

    window.addEventListener('keydown', handleEditorKeyDown, true);
    return () => window.removeEventListener('keydown', handleEditorKeyDown, true);
  }, [insertMarkdown]);

  // Handle wikilink and slash command detection
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    onChange(value);

    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);

    // Get position for dropdown
    const rect = textarea.getBoundingClientRect();
    const lineHeight = 24;
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length;
    const menuTop = Math.min(rect.top + (currentLine * lineHeight) + 24, window.innerHeight - 320);
    const menuLeft = Math.min(rect.left + 100, window.innerWidth - 280);

    // Check if we're typing a wikilink
    const wikilinkMatch = textBeforeCursor.match(/\[\[([^\]]*?)$/);

    if (wikilinkMatch) {
      setAutocompletePos({ top: menuTop, left: menuLeft });
      setAutocompleteSearch(wikilinkMatch[1]);
      setSlashMenuPos(null);
      return;
    } else {
      setAutocompletePos(null);
      setAutocompleteSearch('');
    }

    // Check for slash command at start of line
    const currentLineText = lines[lines.length - 1];
    const slashMatch = currentLineText.match(/^\/(\w*)$/);

    if (slashMatch) {
      setSlashMenuPos({ top: menuTop, left: menuLeft });
      setSlashSearch(slashMatch[1]);
    } else {
      setSlashMenuPos(null);
      setSlashSearch('');
    }
  }, [onChange]);

  const handleWikilinkSelect = useCallback((note: Note) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPos);
    const wikilinkStart = textBeforeCursor.lastIndexOf('[[');

    if (wikilinkStart !== -1) {
      const newContent =
        content.substring(0, wikilinkStart) +
        `[[${note.title}]]` +
        content.substring(cursorPos);

      onChange(newContent);
      setAutocompletePos(null);
      setAutocompleteSearch('');

      setTimeout(() => {
        textarea.focus();
        const newPos = wikilinkStart + note.title.length + 4;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
  }, [content, onChange]);

  const handleWikilinkCreate = useCallback((title: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPos);
    const wikilinkStart = textBeforeCursor.lastIndexOf('[[');

    if (wikilinkStart !== -1) {
      const newContent =
        content.substring(0, wikilinkStart) +
        `[[${title}]]` +
        content.substring(cursorPos);

      onChange(newContent);
      setAutocompletePos(null);
      setAutocompleteSearch('');

      // Trigger note creation via wikilink click
      if (onWikilinkClick) {
        onWikilinkClick(null, title);
      }

      setTimeout(() => {
        textarea.focus();
        const newPos = wikilinkStart + title.length + 4;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
  }, [content, onChange, onWikilinkClick]);

  // Handle slash command selection
  const handleSlashSelect = useCallback((action: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;

    // Remove the slash command and insert the action
    const newContent =
      content.substring(0, currentLineStart) +
      action +
      content.substring(cursorPos);

    onChange(newContent);
    setSlashMenuPos(null);
    setSlashSearch('');

    setTimeout(() => {
      textarea.focus();
      const newPos = currentLineStart + action.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [content, onChange]);

  const handleToolbarAction = (action: string) => {
    switch (action) {
      case 'bold':
        insertMarkdown('**', '**');
        break;
      case 'italic':
        insertMarkdown('*', '*');
        break;
      case 'h1':
        insertMarkdown('# ');
        break;
      case 'h2':
        insertMarkdown('## ');
        break;
      case 'list':
        insertMarkdown('- ');
        break;
      case 'ordered-list':
        insertMarkdown('1. ');
        break;
      case 'code':
        insertMarkdown('`', '`');
        break;
      case 'codeblock':
        insertMarkdown('```\n', '\n```');
        break;
      case 'quote':
        insertMarkdown('> ');
        break;
      case 'link':
        insertMarkdown('[', '](url)');
        break;
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className={cn('flex flex-col h-full bg-card rounded-lg border', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleToolbarAction('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleToolbarAction('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleToolbarAction('h1')}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleToolbarAction('h2')}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleToolbarAction('list')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleToolbarAction('ordered-list')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleToolbarAction('code')}
            title="Inline Code"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleToolbarAction('quote')}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleToolbarAction('link')}
            title="Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Save Status */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <Check className="h-3 w-3 text-primary" />
                <span>Saved</span>
              </>
            ) : null}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 rounded-none px-2"
              onClick={() => setViewMode('edit')}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'split' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 rounded-none px-2 border-x"
              onClick={() => setViewMode('split')}
            >
              <Columns className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 rounded-none px-2"
              onClick={() => setViewMode('preview')}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={cn('flex-1 overflow-auto', viewMode === 'split' && 'border-r')}>
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              placeholder={placeholder}
              spellCheck={spellCheck}
              className={cn(
                'w-full h-full min-h-full resize-none border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 font-mono p-4 transition-all',
                fontSizeClass
              )}
            />
          </div>
        )}

        {/* Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex-1 overflow-auto p-4">
            {onWikilinkClick && notes.length > 0 ? (
              <WikilinkRenderer
                content={content || '*No content yet...*'}
                notes={notes.filter(n => n.id !== currentNoteId)}
                onWikilinkClick={onWikilinkClick}
              />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode } & Record<string, unknown>) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={oneLight}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={cn('bg-muted px-1 py-0.5 rounded text-sm', className)} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {content || '*No content yet...*'}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Wikilink Autocomplete */}
      <WikilinkAutocomplete
        notes={notes.filter(n => n.id !== currentNoteId)}
        position={autocompletePos}
        searchText={autocompleteSearch}
        onSelect={handleWikilinkSelect}
        onCreate={handleWikilinkCreate}
        onClose={() => {
          setAutocompletePos(null);
          setAutocompleteSearch('');
        }}
      />

      {/* Slash Command Menu */}
      <SlashCommandMenu
        position={slashMenuPos}
        searchText={slashSearch}
        onSelect={handleSlashSelect}
        onClose={() => {
          setSlashMenuPos(null);
          setSlashSearch('');
        }}
      />

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
        <span>Markdown · [[wikilinks]] supported</span>
      </div>
    </div>
  );
}
