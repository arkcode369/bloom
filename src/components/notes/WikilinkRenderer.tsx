import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import type { Note } from '@/hooks/useNotes';

interface WikilinkRendererProps {
  content: string;
  notes: Note[];
  onWikilinkClick: (noteId: string | null, title: string) => void;
  className?: string;
}

export default function WikilinkRenderer({
  content,
  notes,
  onWikilinkClick,
  className,
}: WikilinkRendererProps) {
  // Process wikilinks in the content
  const processedContent = processWikilinks(content, notes, onWikilinkClick);

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      {processedContent}
    </div>
  );
}

function processWikilinks(
  content: string, 
  notes: Note[], 
  onWikilinkClick: (noteId: string | null, title: string) => void
): React.ReactNode {
  // Split by wikilinks while preserving them
  const parts = content.split(/(\[\[[^\]]+\]\])/g);
  
  const elements: React.ReactNode[] = [];
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const wikiMatch = part.match(/^\[\[([^\]]+)\]\]$/);
    
    if (wikiMatch) {
      const title = wikiMatch[1];
      const linkedNote = notes.find(n => 
        n.title.toLowerCase() === title.toLowerCase()
      );
      
      elements.push(
        <WikilinkButton
          key={i}
          title={title}
          exists={!!linkedNote}
          onClick={() => onWikilinkClick(linkedNote?.id || null, title)}
        />
      );
    } else if (part) {
      // Render markdown for non-wikilink parts
      elements.push(
        <MarkdownPart key={i} content={part} />
      );
    }
  }
  
  return <>{elements}</>;
}

function WikilinkButton({ 
  title, 
  exists, 
  onClick 
}: { 
  title: string; 
  exists: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-sm font-medium transition-colors',
        exists 
          ? 'text-primary hover:bg-primary/10 underline decoration-primary/30' 
          : 'text-coral hover:bg-coral/10 underline decoration-wavy decoration-coral/50'
      )}
    >
      {title}
    </button>
  );
}

function MarkdownPart({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
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
        // Wrap in span to allow inline rendering
        p({ children }) {
          return <span>{children}</span>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
