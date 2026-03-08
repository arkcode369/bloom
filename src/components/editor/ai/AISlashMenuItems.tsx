/**
 * AI Slash Menu Items for BlockNote Editor
 * 
 * Adds /ai-write, /ai-rewrite, /ai-summarize, /ai-expand, /ai-translate
 * to the "/" slash command menu.
 * 
 * Integrates with: @/lib/ai (ChatRequest type, useAI hook)
 * Used by: BlockNoteEditor.tsx via SuggestionMenuController
 */
import { BlockNoteEditor } from '@blocknote/core';

export type AIAction =
  | 'continue'
  | 'rewrite'
  | 'summarize'
  | 'expand'
  | 'translate'
  | 'grammar'
  | 'formal'
  | 'casual'
  | 'simplify';

export interface AISlashItem {
  title: string;
  subtext: string;
  group: string;
  aliases: string[];
  onItemClick: (editor: BlockNoteEditor) => void;
}

export function getAISlashMenuItems(
  onAIAction: (action: AIAction, editor: BlockNoteEditor) => void
): AISlashItem[] {
  return [
    {
      title: 'AI: Continue Writing',
      subtext: 'Let AI continue from where you left off',
      group: 'AI Assistant',
      aliases: ['ai-write', 'ai', 'continue', 'write'],
      onItemClick: (editor) => onAIAction('continue', editor),
    },
    {
      title: 'AI: Rewrite Selection',
      subtext: 'Rewrite the selected text with AI',
      group: 'AI Assistant',
      aliases: ['ai-rewrite', 'rewrite', 'rephrase', 'improve'],
      onItemClick: (editor) => onAIAction('rewrite', editor),
    },
    {
      title: 'AI: Summarize',
      subtext: 'Summarize the current note or selection',
      group: 'AI Assistant',
      aliases: ['ai-summarize', 'summarize', 'summary', 'tldr'],
      onItemClick: (editor) => onAIAction('summarize', editor),
    },
    {
      title: 'AI: Expand',
      subtext: 'Expand and elaborate on the current text',
      group: 'AI Assistant',
      aliases: ['ai-expand', 'expand', 'elaborate', 'detail'],
      onItemClick: (editor) => onAIAction('expand', editor),
    },
    {
      title: 'AI: Translate',
      subtext: 'Translate text to another language',
      group: 'AI Assistant',
      aliases: ['ai-translate', 'translate', 'translation'],
      onItemClick: (editor) => onAIAction('translate', editor),
    },
    {
      title: 'AI: Fix Grammar',
      subtext: 'Fix grammar and spelling errors',
      group: 'AI Assistant',
      aliases: ['ai-grammar', 'grammar', 'fix', 'spelling'],
      onItemClick: (editor) => onAIAction('grammar', editor),
    },
    {
      title: 'AI: Make Formal',
      subtext: 'Convert to formal/professional tone',
      group: 'AI Assistant',
      aliases: ['ai-formal', 'formal', 'professional'],
      onItemClick: (editor) => onAIAction('formal', editor),
    },
    {
      title: 'AI: Make Casual',
      subtext: 'Convert to casual/friendly tone',
      group: 'AI Assistant',
      aliases: ['ai-casual', 'casual', 'friendly', 'informal'],
      onItemClick: (editor) => onAIAction('casual', editor),
    },
    {
      title: 'AI: Simplify',
      subtext: 'Simplify complex text for easier reading',
      group: 'AI Assistant',
      aliases: ['ai-simplify', 'simplify', 'simple', 'easy'],
      onItemClick: (editor) => onAIAction('simplify', editor),
    },
  ];
}

export function getSystemPromptForAction(action: AIAction, lang?: string): string {
  const prompts: Record<AIAction, string> = {
    continue: `You are a writing assistant integrated into a note-taking app called Bloom. Continue writing from where the user left off. 
Match the tone, style, and topic of the existing text. Write 2-4 natural paragraphs.
Only output the continuation text, no meta-commentary.`,

    rewrite: `You are a writing assistant in Bloom. Rewrite the given text to improve clarity, flow, and readability.
Preserve the original meaning and key information. Only output the rewritten text.`,

    summarize: `You are a writing assistant in Bloom. Provide a concise summary of the given text.
Capture the key points in 2-5 bullet points. Use markdown bullet format (- point).`,

    expand: `You are a writing assistant in Bloom. Expand and elaborate on the given text.
Add more detail, examples, and explanation while keeping the same tone.
Only output the expanded text.`,

    translate: `You are a translation assistant in Bloom. Translate the given text to ${lang || 'English'}.
Preserve the original formatting and meaning. Only output the translated text.`,

    grammar: `You are a grammar checker in Bloom. Fix all grammar, spelling, and punctuation errors in the given text.
Preserve the original meaning and style. Only output the corrected text.`,

    formal: `You are a writing assistant in Bloom. Rewrite the given text in a formal, professional tone.
Preserve the original meaning. Only output the formal version.`,

    casual: `You are a writing assistant in Bloom. Rewrite the given text in a casual, friendly tone.
Preserve the original meaning. Only output the casual version.`,

    simplify: `You are a writing assistant in Bloom. Simplify the given text for easier reading.
Use shorter sentences, simpler words, and clearer structure.
Preserve the key information. Only output the simplified text.`,
  };

  return prompts[action];
}

export const AI_ACTION_LABELS: Record<AIAction, string> = {
  continue: 'Continue Writing',
  rewrite: 'Rewrite',
  summarize: 'Summary',
  expand: 'Expanded',
  translate: 'Translation',
  grammar: 'Grammar Fix',
  formal: 'Formal Version',
  casual: 'Casual Version',
  simplify: 'Simplified',
};
