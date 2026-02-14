import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, GripHorizontal, X } from 'lucide-react';
import { useDataAdapter } from '@/lib/data/DataProvider';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { toast } from 'sonner';

export function QuickCaptureWidget() {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adapter = useDataAdapter();
  const queryClient = useQueryClient();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleStartDrag = async () => {
    try {
      await getCurrentWebviewWindow().startDragging();
    } catch (e) {
      console.error('Drag failed:', e);
    }
  };

  const handleClose = async () => {
    console.log('Closing quick capture widget...');
    try {
      const win = getCurrentWebviewWindow();
      console.log('Got current webview window');
      await win.close();
      console.log('Window closed successfully');
    } catch (e) {
      console.error('Close failed:', e);
      try {
        console.log('Trying destroy instead...');
        await getCurrentWebviewWindow().destroy();
        console.log('Window destroyed successfully');
      } catch (e2) {
        console.error('Destroy also failed:', e2);
        // Last resort
      }
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      const now = new Date();
      const title = `Quick Capture (${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')})`;
      // Use adapter directly to avoid FOREIGN KEY issues with default_tags
      await adapter.notes.create({ title, content: content.trim() });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setContent('');
      toast.success('Captured!');
      setTimeout(() => handleClose(), 600);
    } catch (error) {
      console.error('Quick capture failed:', error);
      toast.error('Failed to capture');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      className="h-screen w-screen bg-background/[0.97] backdrop-blur-2xl border border-border/40 rounded-xl overflow-hidden flex flex-col"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)' }}
    >
      {/* Header */}
      <div
        onMouseDown={handleStartDrag}
        className="flex items-center justify-between px-2.5 py-1.5 cursor-grab active:cursor-grabbing bg-muted/20 border-b border-border/20"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🌸</span>
          <span className="text-[11px] font-semibold text-foreground/80">Quick Capture</span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded-md hover:bg-muted/60 transition-colors"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-2.5 pt-2 pb-1.5 flex flex-col min-h-0">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Capture your thought..."
          className="flex-1 w-full text-[12px] leading-relaxed bg-transparent text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-border/20 bg-muted/10">
        <span className="text-[9px] text-muted-foreground/50">
          {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to save · Esc to close
        </span>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || saving}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-2.5 h-2.5" />
          Capture
        </button>
      </div>
    </motion.div>
  );
}
