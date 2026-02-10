import { Block, PartialBlock } from "@blocknote/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseInlineContent(text: string): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = [];
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = wikilinkRegex.exec(text)) !== null) {
    // Add text before the wikilink
    if (match.index > lastIndex) {
      result.push({
        type: "text",
        text: text.slice(lastIndex, match.index),
        styles: {},
      });
    }

    // Add the wikilink
    result.push({
      type: "wikilink",
      props: { title: match[1] },
      content: undefined,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push({
      type: "text",
      text: text.slice(lastIndex),
      styles: {},
    });
  }

  return result.length > 0 ? result : [{ type: "text", text: text, styles: {} }];
}

// Convert markdown to BlockNote blocks
export function markdownToBlocks(markdown: string): PartialBlock[] {
  if (!markdown) return [];

  const lines = markdown.split('\n');
  const blocks: PartialBlock[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLanguage = line.slice(3).trim();
        codeBlockContent = [];
      } else {
        blocks.push({
          type: "codeBlock",
          props: { language: codeBlockLanguage || "text" },
          content: codeBlockContent.join('\n'),
        });
        inCodeBlock = false;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Skip empty lines (but they create paragraph spacing)
    if (!line.trim()) {
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push({
        type: "heading",
        props: { level: 3 },
        content: parseInlineContent(line.slice(4)),
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        type: "heading",
        props: { level: 2 },
        content: parseInlineContent(line.slice(3)),
      });
    } else if (line.startsWith('# ')) {
      blocks.push({
        type: "heading",
        props: { level: 1 },
        content: parseInlineContent(line.slice(2)),
      });
    }
    else if (line.match(/^[-*]\s+\[[ x]\]\s+/i)) {
      const isChecked = line.includes('[x]') || line.includes('[X]');
      const content = line.replace(/^[-*]\s+\[[ xX]\]\s+/, '');
      blocks.push({
        type: "checkListItem",
        props: { checked: isChecked },
        content: parseInlineContent(content),
      });
    }
    // Bullet list
    else if (line.match(/^[-*]\s+/)) {
      const content = line.replace(/^[-*]\s+/, '');
      blocks.push({
        type: "bulletListItem",
        content: parseInlineContent(content),
      });
    }
    // Numbered list
    else if (line.match(/^\d+\.\s+/)) {
      const content = line.replace(/^\d+\.\s+/, '');
      blocks.push({
        type: "numberedListItem",
        content: parseInlineContent(content),
      });
    }
    // Blockquote
    else if (line.startsWith('> ')) {
      blocks.push({
        type: "paragraph",
        content: parseInlineContent(line.slice(2)),
      });
    }
    // Horizontal rule
    else if (line.match(/^[-*_]{3,}$/)) {
      // BlockNote doesn't have a native divider block, skip for now
      continue;
    }
    // Regular paragraph
    else {
      blocks.push({
        type: "paragraph",
        content: parseInlineContent(line),
      });
    }
  }

  return blocks;
}

// Check if content is old markdown or new JSON blocks
export function parseNoteContent(content: string | null): PartialBlock[] {
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed as PartialBlock[];
    }
  } catch {
    // It's markdown - convert to blocks
    return markdownToBlocks(content);
  }

  return [];
}

// Serialize blocks to JSON string for storage
export function serializeBlocks(blocks: Block[]): string {
  return JSON.stringify(blocks);
}

// Extract wikilinks from block content
export function extractWikilinksFromBlocks(blocks: Block[]): string[] {
  const titles: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function traverseContent(content: any) {
    if (!content) return;

    if (Array.isArray(content)) {
      content.forEach(traverseContent);
    } else if (typeof content === 'object') {
      if (content.type === 'wikilink' && content.props?.title) {
        titles.push(content.props.title);
      }
      if (content.content) {
        traverseContent(content.content);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function traverseBlock(block: any) {
    if (!block) return;

    // Check block content
    if (block.content) {
      traverseContent(block.content);
    }

    // Check nested children
    if (block.children && Array.isArray(block.children)) {
      block.children.forEach(traverseBlock);
    }
  }

  blocks.forEach(traverseBlock);

  return [...new Set(titles)]; // Remove duplicates
}

// Extract plain text from blocks for search
export function extractPlainText(blocks: Block[]): string {
  const textParts: string[] = [];

  function traverseContent(content: any) {
    if (!content) return;

    if (Array.isArray(content)) {
      content.forEach(traverseContent);
    } else if (typeof content === 'object') {
      if (content.type === 'text' && content.text) {
        textParts.push(content.text);
      } else if (content.type === 'wikilink' && content.props?.title) {
        textParts.push(`[[${content.props.title}]]`);
      }
      if (content.content) {
        traverseContent(content.content);
      }
    } else if (typeof content === 'string') {
      textParts.push(content);
    }
  }

  function traverseBlock(block: any) {
    if (!block) return;

    if (block.content) {
      traverseContent(block.content);
    }

    if (block.children && Array.isArray(block.children)) {
      block.children.forEach(traverseBlock);
    }
  }

  blocks.forEach(block => {
    traverseBlock(block);
    textParts.push('\n');
  });

  return textParts.join('').trim();
}

// Get a preview of note content (handles both BlockNote JSON and legacy markdown)
export function getContentPreview(content: string | null, maxLength: number = 100): string {
  if (!content) return '';

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      const plainText = extractPlainText(parsed);
      return plainText.slice(0, maxLength).trim();
    }
  } catch {
    // Fallback for legacy markdown content
    return content
      .replace(/[#*_`>\[\]{}]/g, '')
      .slice(0, maxLength)
      .trim();
  }

  return '';
}
