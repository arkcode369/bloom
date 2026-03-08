/**
 * useAIWriter Hook
 * 
 * Orchestrates AI writing operations in the BlockNote editor.
 * Handles: slash command triggers, toolbar actions, streaming to preview,
 * block insertion/replacement, and undo support.
 * 
 * Integrates with:
 *   - useAI() from @/lib/ai for chat/streaming
 *   - BlockNoteEditor for block manipulation
 *   - extractPlainText() from blockUtils for context extraction
 *   - AIInlinePreview for streaming display
 * 
 * Usage in BlockNoteEditor.tsx:
 * ```tsx
 * const { chatStream, isEnabled, isStreaming, streamContent, abortStream } = useAI();
 * const aiWriter = useAIWriter({ chatStream, isEnabled, isStreaming, streamContent, abortStream });
 * ```
 */
import { useState, useCallback, useRef } from 'react';
import { BlockNoteEditor } from '@blocknote/core';
import { type AIAction, getSystemPromptForAction } from './AISlashMenuItems';
import type { ChatRequest, ChatResponse } from '@/lib/ai/types';

// ============= Types =============

interface UseAIWriterOptions {
  /** chatStream from useAI() -- streams a ChatRequest */
  chatStream: (request: ChatRequest) => Promise<ChatResponse | null>;
  /** abortStream from useAI() -- cancels in-flight stream */
  abortStream: () => void;
  /** Whether AI is enabled in settings */
  isEnabled: boolean;
  /** Whether a stream is currently active (from useAI) */
  isStreaming: boolean;
  /** Accumulated stream content (from useAI) */
  streamContent: string;
}

export interface AIWriterState {
  /** Whether an AI operation is in progress */
  isProcessing: boolean;
  /** The current AI action being executed */
  currentAction: AIAction | null;
  /** The original text that was selected/targeted */
  originalText: string;
  /** Whether the preview panel should be visible */
  previewVisible: boolean;
  /** Error message if operation failed */
  error: string | null;
}

// ============= Hook =============

export function useAIWriter({
  chatStream,
  abortStream,
  isEnabled,
  isStreaming,
  streamContent,
}: UseAIWriterOptions) {
  const [state, setState] = useState<AIWriterState>({
    isProcessing: false,
    currentAction: null,
    originalText: '',
    previewVisible: false,
    error: null,
  });

  // Refs for editor instance and undo snapshots
  const editorRef = useRef<BlockNoteEditor | null>(null);
  const undoSnapshotRef = useRef<string | null>(null);

  // ─── Context Extraction ────────────────────

  /**
   * Extract text from selected blocks or current block.
   * Uses BlockNote's selection API to get content.
   */
  const getSelectedText = useCallback((editor: BlockNoteEditor): string => {
    // Try multi-block selection first
    const selection = editor.getSelection();
    if (selection) {
      const blocks = selection.blocks;
      if (blocks && blocks.length > 0) {
        return blocks
          .map((block: any) => {
            if (block.content && Array.isArray(block.content)) {
              return block.content.map((c: any) => c.text || '').join('');
            }
            if (typeof block.content === 'string') return block.content;
            return '';
          })
          .filter(Boolean)
          .join('\n');
      }
    }

    // Fall back to current block at cursor
    const cursor = editor.getTextCursorPosition();
    if (cursor?.block) {
      const block = cursor.block;
      if (block.content && Array.isArray(block.content)) {
        return block.content.map((c: any) => c.text || '').join('');
      }
      if (typeof block.content === 'string') return block.content;
    }

    return '';
  }, []);

  /**
   * Extract full document text for context (used by 'continue' action).
   */
  const getFullDocumentText = useCallback((editor: BlockNoteEditor): string => {
    const blocks = editor.document;
    return blocks
      .map((block: any) => {
        if (block.content && Array.isArray(block.content)) {
          return block.content.map((c: any) => c.text || '').join('');
        }
        if (typeof block.content === 'string') return block.content;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }, []);

  // ─── Execute AI Action ─────────────────────

  /**
   * Execute an AI writing action.
   * Called from slash menu items and toolbar buttons.
   * 
   * @param action - The AI action to perform
   * @param editor - The BlockNote editor instance
   * @param overrideText - Optional text to use instead of selection (from toolbar)
   */
  const executeAction = useCallback(
    async (action: AIAction, editor: BlockNoteEditor, overrideText?: string) => {
      if (!isEnabled) {
        setState(prev => ({
          ...prev,
          error: 'AI is not enabled. Configure it in Settings > AI.',
        }));
        return;
      }

      editorRef.current = editor;
      const contextText = overrideText || getSelectedText(editor);

      // For 'continue', use full document as context
      const inputText = action === 'continue' ? getFullDocumentText(editor) : contextText;

      if (!inputText && action !== 'continue') {
        setState(prev => ({
          ...prev,
          error: 'No text selected. Select some text or place your cursor in a block.',
        }));
        return;
      }

      // Save undo snapshot before any changes
      undoSnapshotRef.current = JSON.stringify(editor.document);

      setState({
        isProcessing: true,
        currentAction: action,
        originalText: contextText,
        previewVisible: true,
        error: null,
      });

      try {
        const systemPrompt = getSystemPromptForAction(action);

        let userContent = '';
        if (action === 'continue') {
          userContent = `Here is my note so far:\n\n${inputText}\n\nPlease continue writing from where I left off.`;
        } else if (action === 'translate') {
          userContent = `Translate the following text to English:\n\n${inputText}`;
        } else {
          userContent = inputText;
        }

        // Build ChatRequest matching our AI service types
        const request: ChatRequest = {
          messages: [
            { role: 'user', content: userContent },
          ],
          systemPrompt,
          temperature: action === 'grammar' ? 0.1 : 0.7,
          maxTokens: action === 'summarize' ? 500 : 2000,
          stream: true,
        };

        // chatStream from useAI handles streaming internally
        // streamContent reactive state will update in real-time
        await chatStream(request);

        setState(prev => ({
          ...prev,
          isProcessing: false,
        }));
      } catch (err: any) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: err?.message || 'AI request failed. Check your settings.',
        }));
      }
    },
    [isEnabled, chatStream, getSelectedText, getFullDocumentText]
  );

  // ─── Accept Suggestion ─────────────────────

  /**
   * Accept the AI suggestion and insert/replace content in the editor.
   * Different strategies based on the action type:
   *   - continue: Insert after current cursor position
   *   - summarize: Insert as bullet list after current position
   *   - rewrite/grammar/formal/casual/simplify: Replace selection or current block
   *   - expand: Replace current content with expanded version
   */
  const acceptSuggestion = useCallback(
    (text: string) => {
      const editor = editorRef.current;
      if (!editor || !text) return;

      const action = state.currentAction;

      try {
        if (action === 'continue') {
          // Insert new paragraphs after cursor
          const cursor = editor.getTextCursorPosition();
          if (cursor?.block) {
            const paragraphs = text.split('\n\n').filter(Boolean);
            const newBlocks = paragraphs.map((p: string) => ({
              type: 'paragraph' as const,
              content: p.trim(),
            }));
            editor.insertBlocks(newBlocks, cursor.block, 'after');
          }
        } else if (action === 'summarize') {
          // Insert summary lines (detect bullets vs paragraphs)
          const cursor = editor.getTextCursorPosition();
          if (cursor?.block) {
            const lines = text.split('\n').filter(Boolean);
            const newBlocks = lines.map((line: string) => {
              const bulletMatch = line.match(/^[-*]\s+(.*)/);
              if (bulletMatch) {
                return {
                  type: 'bulletListItem' as const,
                  content: bulletMatch[1].trim(),
                };
              }
              const numberedMatch = line.match(/^\d+\.\s+(.*)/);
              if (numberedMatch) {
                return {
                  type: 'numberedListItem' as const,
                  content: numberedMatch[1].trim(),
                };
              }
              return {
                type: 'paragraph' as const,
                content: line.trim(),
              };
            });
            editor.insertBlocks(newBlocks, cursor.block, 'after');
          }
        } else {
          // Replacement actions: rewrite, grammar, formal, casual, simplify, expand, translate
          const selection = editor.getSelection();
          if (selection && selection.blocks.length > 0) {
            // Replace selected blocks
            const lastBlock = selection.blocks[selection.blocks.length - 1];

            const paragraphs = text.split('\n\n').filter(Boolean);
            const newBlocks = paragraphs.map((p: string) => ({
              type: 'paragraph' as const,
              content: p.trim(),
            }));

            // Insert new blocks after selection, then remove old ones
            editor.insertBlocks(newBlocks, lastBlock, 'after');
            const blockIds = selection.blocks.map((b: any) => b);
            editor.removeBlocks(blockIds);
          } else {
            // No selection -- replace current block content
            const cursor = editor.getTextCursorPosition();
            if (cursor?.block) {
              // If the result has multiple paragraphs, split into blocks
              const paragraphs = text.split('\n\n').filter(Boolean);
              if (paragraphs.length === 1) {
                editor.updateBlock(cursor.block, {
                  content: text.trim(),
                });
              } else {
                // Replace current block and add extras after
                editor.updateBlock(cursor.block, {
                  content: paragraphs[0].trim(),
                });
                const extraBlocks = paragraphs.slice(1).map((p: string) => ({
                  type: 'paragraph' as const,
                  content: p.trim(),
                }));
                editor.insertBlocks(extraBlocks, cursor.block, 'after');
              }
            }
          }
        }
      } catch (err) {
        console.error('[useAIWriter] Error inserting content:', err);
      }

      // Close preview and reset state
      setState({
        isProcessing: false,
        currentAction: null,
        originalText: '',
        previewVisible: false,
        error: null,
      });
    },
    [state.currentAction]
  );

  // ─── Reject Suggestion ─────────────────────

  /**
   * Reject the AI suggestion and close the preview.
   * Also aborts any in-flight stream.
   */
  const rejectSuggestion = useCallback(() => {
    abortStream();
    setState({
      isProcessing: false,
      currentAction: null,
      originalText: '',
      previewVisible: false,
      error: null,
    });
  }, [abortStream]);

  // ─── Retry ─────────────────────────────────

  /**
   * Retry the current action with the same input.
   * Useful when the user wants a different AI response.
   */
  const retrySuggestion = useCallback(() => {
    const editor = editorRef.current;
    const action = state.currentAction;
    if (editor && action) {
      // Abort current stream first
      abortStream();
      // Re-execute with the original text
      executeAction(action, editor, state.originalText || undefined);
    }
  }, [state.currentAction, state.originalText, executeAction, abortStream]);

  // ─── Undo ──────────────────────────────────

  /**
   * Undo the last accepted AI change by restoring the document snapshot.
   * This is a safety net -- the user can also use Ctrl+Z in the editor.
   */
  const undoLastChange = useCallback(() => {
    const editor = editorRef.current;
    const snapshot = undoSnapshotRef.current;
    if (editor && snapshot) {
      try {
        const blocks = JSON.parse(snapshot);
        editor.replaceBlocks(editor.document, blocks);
        undoSnapshotRef.current = null;
      } catch (err) {
        console.error('[useAIWriter] Undo failed:', err);
      }
    }
  }, []);

  // ─── Clear Error ───────────────────────────

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ─── Return ────────────────────────────────

  return {
    /** Current state of the AI writer */
    state,
    /** The streamed AI text (from useAI reactive state) */
    aiText: streamContent,
    /** Whether currently streaming (from useAI) */
    isStreaming,
    /** Execute an AI action on the editor */
    executeAction,
    /** Accept the current AI suggestion */
    acceptSuggestion,
    /** Reject and close the preview */
    rejectSuggestion,
    /** Retry with different output */
    retrySuggestion,
    /** Undo the last accepted change */
    undoLastChange,
    /** Clear error state */
    clearError,
  };
}

export default useAIWriter;
