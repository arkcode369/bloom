import { useCallback } from 'react';
import { useDataAdapter } from '@/lib/data/DataProvider';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';

export function useImport() {
    const adapter = useDataAdapter();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    const importJSON = useCallback(async () => {
        try {
            const selected = await openDialog({
                multiple: false,
                filters: [{ name: 'JSON', extensions: ['json'] }],
                title: t('settings.import_json_title') || 'Import Workspace JSON',
            });

            if (!selected || typeof selected !== 'string') return;

            const content = await readFile(selected);
            const decoder = new TextDecoder();
            const data = JSON.parse(decoder.decode(content));

            if (!data.notes || !Array.isArray(data.notes)) {
                throw new Error('Invalid workspace format');
            }

            let importedCount = 0;
            let skippedCount = 0;

            for (const noteData of data.notes) {
                try {
                    // Check if note already exists
                    const existing = await adapter.notes.getById(noteData.id);
                    if (existing) {
                        // For now, let's skip or overwrite?
                        // Overwriting is cleaner for a "restore"
                        await adapter.notes.update(noteData.id, {
                            title: noteData.title,
                            content: noteData.content,
                            is_starred: noteData.is_starred,
                            is_pinned: noteData.is_pinned,
                            is_archived: noteData.is_archived,
                        });
                        skippedCount++; // count as "updated/merged"
                    } else {
                        // Create new note
                        // We use the adapter.notes.create but we might need a way to preserve the original ID
                        // The current adapter doesn't expose a 'force create with ID'.
                        // Let's assume the user wants to merge into existing.
                        // For simplicity, we create as new if ID doesn't exist.

                        // Create new note with preserved ID
                        await adapter.notes.create({
                            title: noteData.title,
                            content: noteData.content,
                        }, [], noteData.id);
                        importedCount++;
                    }
                } catch (err) {
                    console.error('Failed to import note:', noteData.title, err);
                }
            }

            // Import tags if present
            if (data.tags && Array.isArray(data.tags)) {
                for (const tagData of data.tags) {
                    try {
                        const tags = await adapter.tags.getAll();
                        if (!tags.find(t => t.name === tagData.name)) {
                            await adapter.tags.create({
                                name: tagData.name,
                                color: tagData.color
                            });
                        }
                    } catch (err) {
                        console.error('Failed to import tag:', tagData.name, err);
                    }
                }
            }

            toast.success(`Import complete: ${importedCount} new, ${skippedCount} updated`);

            // Refetch all data
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
            queryClient.invalidateQueries({ queryKey: ['graph-data'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });

        } catch (error) {
            console.error('Import failed:', error);
            toast.error('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }, [adapter, queryClient, t]);

    const importMarkdown = useCallback(async () => {
        try {
            const selected = await openDialog({
                multiple: true,
                filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
                title: t('settings.import_markdown_title') || 'Import Markdown Files',
            });

            if (!selected || !Array.isArray(selected)) return;

            let importedCount = 0;

            for (const path of selected) {
                try {
                    const content = await readFile(path);
                    const decoder = new TextDecoder();
                    const rawText = decoder.decode(content);

                    // Basic frontmatter parsing (very simple)
                    let title = path.split(/[/\\]/).pop()?.replace(/\.md$/, '') || 'Imported Note';
                    let body = rawText;

                    if (rawText.startsWith('---')) {
                        const parts = rawText.split('---\n');
                        if (parts.length >= 3) {
                            const yaml = parts[1];
                            const titleMatch = yaml.match(/title:\s*"(.*)"/);
                            if (titleMatch) title = titleMatch[1];
                            body = parts.slice(2).join('---\n').trim();
                        }
                    }

                    // Remove initial H1 if it repeats the title
                    if (body.startsWith('# ')) {
                        const firstLine = body.split('\n')[0];
                        if (firstLine.substring(2).trim() === title) {
                            body = body.split('\n').slice(1).join('\n').trim();
                        }
                    }

                    // Create note
                    // Note: This will be plain text in BlockNote, which it handles by wrapping in paragraphs.
                    // For better results, we'd need a MD -> BlockNote JSON converter.
                    // But for now, plain text import is a great start.
                    await adapter.notes.create({
                        title,
                        content: JSON.stringify([{ type: 'paragraph', content: [{ type: 'text', text: body, styles: {} }] }]),
                    });
                    importedCount++;
                } catch (err) {
                    console.error('Failed to import markdown:', path, err);
                }
            }

            toast.success(`Imported ${importedCount} notes`);
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
            queryClient.invalidateQueries({ queryKey: ['graph-data'] });

        } catch (error) {
            console.error('Markdown import failed:', error);
            toast.error('Import failed');
        }
    }, [adapter, queryClient, t]);

    return { importJSON, importMarkdown };
}
