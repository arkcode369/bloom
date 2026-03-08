/**
 * AI Writing Toolbar
 * Floating toolbar for AI writing actions on text selection.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type AIAction } from './AISlashMenuItems';
import { Sparkles, FileText, Briefcase, MessageCircle, CheckCheck, Maximize2, Languages } from 'lucide-react';

interface AIWritingToolbarProps {
  onAction: (action: AIAction, selectedText: string) => void;
  isProcessing: boolean;
  isEnabled: boolean;
}

const AI_TOOLBAR_ACTIONS: { action: AIAction; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { action: 'rewrite', label: 'Improve', Icon: Sparkles },
  { action: 'simplify', label: 'Simplify', Icon: FileText },
  { action: 'formal', label: 'Formal', Icon: Briefcase },
  { action: 'casual', label: 'Casual', Icon: MessageCircle },
  { action: 'grammar', label: 'Grammar', Icon: CheckCheck },
  { action: 'expand', label: 'Expand', Icon: Maximize2 },
  { action: 'translate', label: 'Translate', Icon: Languages },
];

const MIN_SELECTION_LENGTH = 3;
const SHOW_DELAY_MS = 300;

export const AIWritingToolbar: React.FC<AIWritingToolbarProps> = ({ onAction, isProcessing, isEnabled }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateToolbarPosition = useCallback(() => {
    if (showTimerRef.current) { clearTimeout(showTimerRef.current); showTimerRef.current = null; }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) { setVisible(false); return; }
    const text = selection.toString().trim();
    if (text.length < MIN_SELECTION_LENGTH) { setVisible(false); return; }
    const range = selection.getRangeAt(0);
    const editorEl = range.commonAncestorContainer instanceof HTMLElement
      ? range.commonAncestorContainer.closest('.bn-editor')
      : range.commonAncestorContainer.parentElement?.closest('.bn-editor');
    if (!editorEl) { setVisible(false); return; }
    showTimerRef.current = setTimeout(() => {
      const currentSelection = window.getSelection();
      if (!currentSelection || currentSelection.isCollapsed) { setVisible(false); return; }
      const currentText = currentSelection.toString().trim();
      if (currentText.length < MIN_SELECTION_LENGTH) { setVisible(false); return; }
      setSelectedText(currentText);
      const currentRange = currentSelection.getRangeAt(0);
      const rect = currentRange.getBoundingClientRect();
      setPosition({ top: rect.top - 48 + window.scrollY, left: rect.left + rect.width / 2 });
      setVisible(true);
    }, SHOW_DELAY_MS);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', updateToolbarPosition);
    return () => { document.removeEventListener('selectionchange', updateToolbarPosition); if (showTimerRef.current) clearTimeout(showTimerRef.current); };
  }, [updateToolbarPosition]);

  useEffect(() => {
    const hide = () => setVisible(false);
    window.addEventListener('scroll', hide, true);
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setTimeout(() => { const sel = window.getSelection(); if (!sel || sel.isCollapsed) setVisible(false); }, 100);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { window.removeEventListener('scroll', hide, true); document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  if (!isEnabled || !visible || isProcessing) return null;

  return (
    <div ref={toolbarRef} className="ai-writing-toolbar" style={{ position: 'absolute', top: `${position.top}px`, left: `${position.left}px`, transform: 'translateX(-50%)', zIndex: 1000 }} onMouseDown={(e) => e.preventDefault()}>
      <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-popover px-1 py-0.5 shadow-lg backdrop-blur-sm">
        <span className="px-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 select-none">AI</span>
        <div className="h-4 w-px bg-border/60" />
        {AI_TOOLBAR_ACTIONS.map(({ action, label, Icon }) => (
          <button key={action} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAction(action, selectedText); setVisible(false); }}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition-colors duration-150" title={label}>
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AIWritingToolbar;
