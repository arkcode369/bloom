import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (content: string) => void;
  isCreating?: boolean;
}

export default function QuickCaptureModal({ isOpen, onClose, onCapture, isCreating }: QuickCaptureModalProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setContent('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (content.trim()) {
      onCapture(content.trim());
      setContent('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl">
        <DialogHeader className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <DialogTitle className="text-base font-semibold">Quick Capture</DialogTitle>
              <DialogDescription className="sr-only">
                Quickly save a thought or note to your inbox.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind? (Ctrl+Enter to save)"
            className="min-h-[150px] resize-none text-lg border-none focus-visible:ring-0 p-0 placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="p-3 border-t bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+'}</span>Enter
            </kbd>
            <span className="text-xs text-muted-foreground italic">
              Saving to "Inbox"
            </span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isCreating}
            size="sm"
            className="rounded-full px-4 gap-2 shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95"
          >
            <Send className="h-3.5 w-3.5" />
            Capture
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
