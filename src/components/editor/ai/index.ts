/**
 * AI Editor Components - Barrel Export
 * 
 * Location: src/components/editor/ai/index.ts
 * 
 * Usage in BlockNoteEditor.tsx:
 * ```tsx
 * import {
 *   getAISlashMenuItems,
 *   AIWritingToolbar,
 *   AIInlinePreview,
 *   useAIWriter,
 *   type AIAction,
 * } from './ai';
 * ```
 */

// Slash menu items and action types
export {
  getAISlashMenuItems,
  getSystemPromptForAction,
  AI_ACTION_LABELS,
} from './AISlashMenuItems';
export type { AIAction, AISlashItem } from './AISlashMenuItems';

// Floating selection toolbar
export { AIWritingToolbar } from './AIWritingToolbar';

// Inline streaming preview with accept/reject
export { AIInlinePreview } from './AIInlinePreview';

// Orchestrator hook
export { useAIWriter } from './useAIWriter';
export type { AIWriterState } from './useAIWriter';
