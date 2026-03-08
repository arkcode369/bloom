/**
 * AI Inline Preview - Shows AI-generated content with Accept/Reject.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Copy, RotateCcw } from 'lucide-react';
import { type AIAction, AI_ACTION_LABELS } from './AISlashMenuItems';

interface AIInlinePreviewProps {
  originalText: string;
  aiText: string;
  isStreaming: boolean;
  onAccept: (text: string) => void;
  onReject: () => void;
  onRetry?: () => void;
  action: AIAction;
}

const DIFF_ACTIONS: AIAction[] = ['rewrite', 'grammar', 'formal', 'casual', 'simplify'];

export const AIInlinePreview: React.FC<AIInlinePreviewProps> = ({ originalText, aiText, isStreaming, onAccept, onReject, onRetry, action }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isStreaming && containerRef.current) {
      const el = containerRef.current.querySelector('.ai-preview-content');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [aiText, isStreaming]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isStreaming) return;
      if (e.key === 'Tab' && aiText) { e.preventDefault(); onAccept(aiText); }
      else if (e.key === 'Escape') { e.preventDefault(); onReject(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, aiText, onAccept, onReject]);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(aiText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { console.warn('[AIInlinePreview] Clipboard write failed'); }
  };

  const actionLabel = AI_ACTION_LABELS[action] || action;
  const showDiff = originalText && DIFF_ACTIONS.includes(action);

  return (
    <div ref={containerRef} className="ai-inline-preview my-2 rounded-lg border border-emerald-500/30 bg-emerald-50/5 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{isStreaming ? `Generating ${actionLabel}...` : actionLabel}</span>
        </div>
        {isStreaming && <span className="text-xs text-muted-foreground animate-pulse">streaming...</span>}
      </div>
      <div className="ai-preview-content max-h-64 overflow-y-auto px-3 py-2">
        {showDiff && (
          <div className="mb-2 rounded bg-red-500/5 px-2 py-1 text-sm text-muted-foreground line-through decoration-red-400/50">
            {originalText.length > 300 ? originalText.slice(0, 300) + '...' : originalText}
          </div>
        )}
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {aiText || (isStreaming ? '' : 'Waiting for response...')}
          {isStreaming && <span className="inline-block w-1.5 h-4 bg-emerald-500 animate-pulse ml-0.5 align-text-bottom rounded-sm" />}
        </div>
      </div>
      {!isStreaming && aiText && (
        <div className="flex items-center justify-between border-t border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
          <div className="flex items-center gap-1">
            <button onClick={() => onAccept(aiText)} className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"><Check className="h-3 w-3" />Accept</button>
            <button onClick={onReject} className="flex items-center gap-1 rounded-md bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"><X className="h-3 w-3" />Reject</button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleCopy} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"><Copy className="h-3 w-3" />{copied ? 'Copied!' : 'Copy'}</button>
            {onRetry && <button onClick={onRetry} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"><RotateCcw className="h-3 w-3" />Retry</button>}
          </div>
        </div>
      )}
      {!isStreaming && !aiText && (
        <div className="flex items-center justify-between border-t border-red-500/20 bg-red-500/5 px-3 py-1.5">
          <span className="text-xs text-destructive">No response received. Check your AI settings.</span>
          <button onClick={onReject} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"><X className="h-3 w-3" />Close</button>
        </div>
      )}
      {!isStreaming && aiText && (
        <div className="px-3 py-1 text-center text-[10px] text-muted-foreground/50 border-t border-border/30">Tab to accept · Esc to reject · Ctrl+Z to undo after accepting</div>
      )}
    </div>
  );
};

export default AIInlinePreview;
