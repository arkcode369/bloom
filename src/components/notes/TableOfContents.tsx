import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string | null;
  className?: string;
  onItemClick?: () => void;
}

export function extractHeadingsFromBlocks(blocks: any[]): HeadingItem[] {
  const headings: HeadingItem[] = [];

  function traverseBlocks(block: any) {
    if (!block) return;

    if (block.type === 'heading' && block.props?.level) {
      let text = '';
      if (block.content) {
        if (Array.isArray(block.content)) {
          text = block.content
            .map((c: any) => c.text || c.props?.title || '')
            .join('');
        } else if (typeof block.content === 'string') {
          text = block.content;
        }
      }

      if (text.trim()) {
        headings.push({
          id: block.id || `heading-${headings.length}`,
          text: text.trim(),
          level: block.props.level,
        });
      }
    }

    if (block.children && Array.isArray(block.children)) {
      block.children.forEach(traverseBlocks);
    }
  }

  blocks.forEach(traverseBlocks);
  return headings;
}

export function TableOfContentsContent({
  content,
  onItemClick
}: {
  content: string | null;
  onItemClick?: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const headings = useMemo(() => {
    if (!content) return [];

    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return extractHeadingsFromBlocks(parsed);
      }
    } catch {
      // Parse markdown headings
      const lines = content.split('\n');
      const mdHeadings: HeadingItem[] = [];

      lines.forEach((line, index) => {
        const match = line.match(/^(#{1,3})\s+(.+)/);
        if (match) {
          mdHeadings.push({
            id: `md-heading-${index}`,
            text: match[2].trim(),
            level: match[1].length,
          });
        }
      });

      return mdHeadings;
    }

    return [];
  }, [content]);

  const scrollToHeading = (headingText: string) => {
    // Find the heading in the editor
    const editorContainer = document.querySelector('.bn-editor');
    if (!editorContainer) return;

    // Find heading elements
    const headingElements = editorContainer.querySelectorAll('h1, h2, h3');

    for (const el of headingElements) {
      if (el.textContent?.trim() === headingText) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveId(headingText);
        onItemClick?.();
        break;
      }
    }
  };

  if (headings.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No headings found
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <List className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Outline
        </span>
      </div>

      <nav className="space-y-0.5 max-h-[60vh] overflow-y-auto pr-1">
        {headings.map((heading, index) => (
          <button
            key={index}
            onClick={() => scrollToHeading(heading.text)}
            className={cn(
              'block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors',
              'hover:bg-muted truncate',
              activeId === heading.text && 'bg-muted text-primary font-medium',
              heading.level === 1 && 'font-medium text-foreground',
              heading.level === 2 && 'pl-4 text-muted-foreground',
              heading.level === 3 && 'pl-6 text-muted-foreground/80 text-xs'
            )}
            title={heading.text}
          >
            {heading.text}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function TableOfContents({ content, className }: TableOfContentsProps) {
  const [isHovered, setIsHovered] = useState(false);

  const headings = useMemo(() => {
    if (!content) return [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return extractHeadingsFromBlocks(parsed);
    } catch {
      const lines = content.split('\n');
      const mdHeadings: HeadingItem[] = [];
      lines.forEach((line, index) => {
        const match = line.match(/^(#{1,3})\s+(.+)/);
        if (match) {
          mdHeadings.push({
            id: `md-heading-${index}`,
            text: match[2].trim(),
            level: match[1].length,
          });
        }
      });
      return mdHeadings;
    }
    return [];
  }, [content]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Trigger Icon */}
      <button
        className={cn(
          'p-2 rounded-md transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          isHovered && 'bg-muted text-foreground'
        )}
        aria-label="Table of Contents"
      >
        <List className="h-4 w-4" />
      </button>

      {/* Hover Panel - appears to the left */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute right-full top-0 mr-2',
              'w-56 overflow-hidden',
              'bg-popover/95 backdrop-blur-sm',
              'border border-border rounded-lg shadow-lg',
              'z-50'
            )}
          >
            <TableOfContentsContent content={content} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
