import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FloatingQuickCaptureProps {
  onCapture: (content: string) => void;
  isCreating?: boolean;
}

export default function FloatingQuickCapture({ onCapture, isCreating }: FloatingQuickCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (content.trim()) {
      onCapture(content.trim());
      setContent('');
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-80 bg-card border rounded-xl shadow-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Quick Capture</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Capture your thought..."
              className="min-h-[100px] resize-none mb-3"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter to save
              </span>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!content.trim() || isCreating}
              >
                <Send className="h-4 w-4 mr-1" />
                Capture
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-colors",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          isOpen && "bg-muted text-muted-foreground hover:bg-muted/90"
        )}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </motion.div>
      </motion.button>
    </div>
  );
}
