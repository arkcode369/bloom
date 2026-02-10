import React from 'react';
import { useTranslation } from 'react-i18next';
import { getWordCount, getReadingTime, getContentPreviewText } from '@/hooks/useWritingStats';
import { Link2, Clock } from 'lucide-react';
import type { TagInfo } from '@/hooks/useGraphData';

interface NodePreviewTooltipProps {
  title: string;
  tags: TagInfo[];
  content: string | null;
  linkCount: number;
}

export default function NodePreviewTooltip({
  title,
  tags,
  content,
  linkCount,
}: NodePreviewTooltipProps) {
  const { t } = useTranslation();
  
  const preview = getContentPreviewText(content, 120);
  const wordCount = getWordCount(content);
  const readingTime = getReadingTime(wordCount);

  return (
    <div className="max-w-xs p-3 rounded-lg bg-popover border shadow-lg text-popover-foreground">
      {/* Title */}
      <h4 className="font-medium text-sm mb-1 truncate">{title}</h4>
      
      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${tag.color}20`, 
                color: tag.color 
              }}
            >
              #{tag.name}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}
      
      {/* Preview */}
      {preview && (
        <p className="text-xs text-muted-foreground line-clamp-3 mb-2">
          {preview}
        </p>
      )}
      
      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Link2 className="h-3 w-3" />
          {linkCount} {t('graph.links')}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {readingTime} {t('graph.min_read')}
        </span>
      </div>
    </div>
  );
}

// Generate HTML string for graph tooltips
export function generateNodePreviewHTML(
  title: string,
  tags: TagInfo[],
  content: string | null,
  linkCount: number
): string {
  const preview = getContentPreviewText(content, 100);
  const wordCount = getWordCount(content);
  const readingTime = getReadingTime(wordCount);

  // Escape HTML to prevent XSS
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  
  const tagHtml = tags.slice(0, 3).map(tag => 
    `<span style="background: ${esc(tag.color)}20; color: ${esc(tag.color)}; padding: 2px 6px; border-radius: 9999px; font-size: 10px;">#${esc(tag.name)}</span>`
  ).join(' ');

  return `
    <div style="max-width: 280px; padding: 12px; background: rgba(0,0,0,0.9); border-radius: 8px; color: white; font-family: system-ui, sans-serif;">
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(title)}</div>
      ${tagHtml ? `<div style="margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 4px;">${tagHtml}</div>` : ''}
      ${preview ? `<p style="font-size: 11px; color: #9ca3af; line-clamp: 3; margin-bottom: 8px; line-height: 1.4;">${esc(preview)}</p>` : ''}
      <div style="display: flex; gap: 12px; font-size: 10px; color: #9ca3af;">
        <span>🔗 ${linkCount} links</span>
        <span>📖 ${readingTime} min read</span>
      </div>
    </div>
  `;
}
