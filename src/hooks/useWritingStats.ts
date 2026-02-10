import { useCallback } from 'react';
import { useWritingStatsContext } from '@/lib/data/WritingStatsProvider';

// Extract plain text from BlockNote JSON content
function extractPlainText(blocks: Record<string, unknown>[]): string {
  let text = '';

  const processContent = (content: unknown[]) => {
    if (!Array.isArray(content)) return;
    content.forEach((item) => {
      if (typeof item === 'string') {
        text += item + ' ';
      } else if (item && typeof item === 'object' && 'text' in item) {
        text += (item as { text: string }).text + ' ';
      } else if (item && typeof item === 'object' && 'content' in item) {
        processContent((item as { content: unknown[] }).content);
      }
    });
  };

  const processBlock = (block: unknown) => {
    if (block && typeof block === 'object' && 'content' in block) {
      const content = (block as { content: unknown }).content;
      if (Array.isArray(content)) {
        processContent(content);
      }
    }
    if (block && typeof block === 'object' && 'children' in block) {
      const children = (block as { children: unknown }).children;
      if (Array.isArray(children)) {
        children.forEach(processBlock);
      }
    }
  };

  blocks.forEach(processBlock);
  return text;
}

export function getWordCount(content: string | null): number {
  if (!content) return 0;

  try {
    const blocks = JSON.parse(content);
    if (Array.isArray(blocks)) {
      const plainText = extractPlainText(blocks);
      const words = plainText.trim().split(/\s+/).filter(w => w.length > 0);
      return words.length;
    }
  } catch {
    // Markdown fallback
    const words = content.trim().split(/\s+/).filter(w => w.length > 0);
    return words.length;
  }

  return 0;
}

export function getReadingTime(wordCount: number): number {
  // Average reading speed: 200 words per minute
  return Math.max(1, Math.ceil(wordCount / 200));
}

export function getContentPreviewText(content: string | null, maxLength = 150): string {
  if (!content) return '';

  try {
    const blocks = JSON.parse(content);
    if (Array.isArray(blocks)) {
      const plainText = extractPlainText(blocks);
      const cleaned = plainText.replace(/\s+/g, ' ').trim();
      return cleaned.length > maxLength
        ? cleaned.slice(0, maxLength) + '...'
        : cleaned;
    }
  } catch {
    const cleaned = content.replace(/\s+/g, ' ').trim();
    return cleaned.length > maxLength
      ? cleaned.slice(0, maxLength) + '...'
      : cleaned;
  }

  return '';
}

export function useWritingStats() {
  const context = useWritingStatsContext();

  return {
    ...context,
    getWordCount,
    getReadingTime,
  };
}
