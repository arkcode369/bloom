import React, { useMemo, useCallback, useEffect, useRef, useState } from "react";
import {
  BlockNoteSchema,
  defaultInlineContentSpecs,
  InlineContentSchema,
  BlockNoteEditor as BlockNoteEditorType,
  PartialBlock,
} from "@blocknote/core";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@mantine/core/styles.css";
import { Note } from "@/hooks/useNotes";
import { useGraphInteractions } from "@/hooks/useGraphInteractions";
import { Wikilink } from "./WikilinkInline";
import { getWikilinkSuggestionItems, WikilinkSuggestionItem } from "./wikilinkSuggestion";
import { parseNoteContent } from "./blockUtils";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { FileText, FilePlus } from "lucide-react";
import { saveAsset } from "@/lib/data/assets";
import { toast } from "sonner";

const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    wikilink: Wikilink,
  },
});

type CustomSchema = typeof schema;

interface BlockNoteEditorProps {
  noteId: string;
  initialContent: string | null;
  onChange: (content: string) => void;
  onSave: () => void;
  isSaving: boolean;
  notes: Note[];
  onWikilinkClick: (noteId: string | null, title: string) => void;
  isFullWidth: boolean;
  autoSaveInterval: number;
  fontSize?: 'small' | 'medium' | 'large';
}

const fontSizeMap = { small: '14px', medium: '16px', large: '18px' };

export default function BlockNoteEditorComponent({
  noteId,
  initialContent,
  onChange,
  onSave,
  isSaving,
  notes,
  onWikilinkClick,
  isFullWidth,
  autoSaveInterval,
  fontSize = 'medium',
}: BlockNoteEditorProps) {
  const { logEdgeInteraction } = useGraphInteractions();
  const { resolvedTheme } = useTheme();
  const contentRef = useRef<string>("");
  const lastNoteIdRef = useRef<string>(noteId);
  const [editorKey, setEditorKey] = useState(0);

  // Parse initial content
  const initialBlocks = useMemo(() => {
    const blocks = parseNoteContent(initialContent);
    return blocks.length > 0 ? blocks : undefined;
  }, [initialContent]);

  // Create editor with custom schema
  const editor = useCreateBlockNote({
    schema,
    initialContent: initialBlocks as PartialBlock<typeof schema.blockSchema, typeof schema.inlineContentSchema, typeof schema.styleSchema>[],
    uploadFile: async (file: File) => {
      try {
        const assetUrl = await saveAsset(file);
        return assetUrl;
      } catch (error) {
        console.error("File upload failed:", error);
        toast.error("Failed to upload file");
        throw error;
      }
    },
  });

  // Reset editor when noteId changes
  useEffect(() => {
    if (lastNoteIdRef.current !== noteId) {
      lastNoteIdRef.current = noteId;
      setEditorKey(prev => prev + 1);
    }
  }, [noteId]);

  // Handle content changes
  const handleChange = useCallback(() => {
    const blocks = editor.document;
    const serialized = JSON.stringify(blocks);
    contentRef.current = serialized;
    onChange(serialized);
  }, [editor, onChange]);

  // Auto-save
  useEffect(() => {
    if (autoSaveInterval <= 0) return;

    const interval = setInterval(() => {
      if (contentRef.current) {
        onSave();
      }
    }, autoSaveInterval * 1000);

    return () => clearInterval(interval);
  }, [autoSaveInterval, onSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  // Handle wikilink clicks
  useEffect(() => {
    const container = document.querySelector('.bn-editor');
    if (!container) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const wikilinkEl = target.closest('[data-wikilink]');
      if (wikilinkEl) {
        const title = wikilinkEl.getAttribute('data-wikilink');
        if (title) {
          const existingNote = notes.find(
            n => n.title.toLowerCase() === title.toLowerCase()
          );

          if (existingNote) {
            // Log traverse interaction for Hebbian learning
            logEdgeInteraction(noteId, existingNote.id, 'traverse');
          }

          onWikilinkClick(existingNote?.id || null, title);
        }
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [notes, onWikilinkClick, noteId, logEdgeInteraction]);

  // Custom wikilink suggestion menu items
  const getWikilinkMenuItems = useCallback(
    (query: string): WikilinkSuggestionItem[] => {
      return getWikilinkSuggestionItems(notes, query);
    },
    [notes]
  );

  // Insert wikilink at current position
  const insertWikilink = useCallback((title: string) => {
    editor.insertInlineContent([
      {
        type: "wikilink",
        props: { title },
      },
      { type: "text", text: " ", styles: {} },
    ]);
  }, [editor]);

  return (
    <div
      key={editorKey}
      className={cn(
        "mx-auto transition-all duration-300 h-full",
        isFullWidth ? "max-w-full px-4" : "max-w-3xl px-4"
      )}
      style={{ '--editor-font-size': fontSizeMap[fontSize] } as React.CSSProperties}
    >
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme={resolvedTheme}
        className="min-h-full"
      >
        <SuggestionMenuController
          triggerCharacter="[["
          getItems={async (query) => {
            const items = getWikilinkMenuItems(query);
            return items.map((item) => ({
              title: item.title,
              key: item.noteId || `create-${item.title}`, // Unique key to prevent React warnings
              onItemClick: () => {
                insertWikilink(item.title);
              },
              group: item.isCreate ? "Create" : "Notes",
              icon: item.isCreate ? (
                <FilePlus className="h-4 w-4 text-primary" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              ),
              subtext: item.isCreate ? `Create "${item.title}"` : undefined,
            }));
          }}
        />
      </BlockNoteView>

      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 text-sm text-muted-foreground bg-card border rounded-lg px-3 py-1.5 shadow-sm animate-fade-in">
          Saving...
        </div>
      )}
    </div>
  );
}
