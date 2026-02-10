import { useCallback } from 'react';
import { useDataAdapter } from '@/lib/data/DataProvider';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '@/hooks/usePreferences';
import type { Note } from '@/lib/data/types';
import { writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { save, open as openDialog } from '@tauri-apps/plugin-dialog';
import { join } from '@tauri-apps/api/path';

function stripBlockNoteJSON(content: string): string {
    try {
        const blocks = JSON.parse(content);
        if (!Array.isArray(blocks)) return content;
        return blocksToMarkdown(blocks);
    } catch {
        return content;
    }
}

function blocksToMarkdown(blocks: unknown[]): string {
    return blocks
        .map((block: unknown) => blockToMarkdown(block as Record<string, unknown>))
        .filter(Boolean)
        .join('\n\n');
}

function blockToMarkdown(block: Record<string, unknown>): string {
    const type = block.type as string;
    const content = block.content as Array<Record<string, unknown>> | undefined;
    const props = block.props as Record<string, unknown> | undefined;
    const inlineText = content ? inlineContentToText(content) : '';

    switch (type) {
        case 'heading': {
            const level = (props?.level as number) || 1;
            return '#'.repeat(level) + ' ' + inlineText;
        }
        case 'paragraph':
            return inlineText;
        case 'bulletListItem':
            return '- ' + inlineText;
        case 'numberedListItem':
            return '1. ' + inlineText;
        case 'checkListItem': {
            const checked = (props?.checked as boolean) || false;
            return `- [${checked ? 'x' : ' '}] ${inlineText}`;
        }
        case 'codeBlock':
            return '```\n' + inlineText + '\n```';
        case 'image': {
            const url = (props?.url as string) || '';
            const caption = (props?.caption as string) || '';
            return `![${caption}](${url})`;
        }
        case 'table': {
            const rows = block.content as Record<string, unknown>[][] | undefined;
            if (!rows || !Array.isArray(rows)) return '';
            return tableToMarkdown(rows);
        }
        default:
            return inlineText;
    }
}

function inlineContentToText(content: Array<Record<string, unknown>>): string {
    return content
        .map((item) => {
            const text = (item.text as string) || '';
            const styles = (item.styles as Record<string, boolean>) || {};
            let result = text;
            if (styles.bold) result = `**${result}**`;
            if (styles.italic) result = `*${result}*`;
            if (styles.strike) result = `~~${result}~~`;
            if (styles.code) result = '`' + result + '`';
            if (item.type === 'link') {
                const href = (item.href as string) || '';
                result = `[${result}](${href})`;
            }
            return result;
        })
        .join('');
}

function tableToMarkdown(rows: Record<string, unknown>[][]): string {
    if (rows.length === 0) return '';
    const header = rows[0];
    const headerRow = '| ' + header.map(() => '---').join(' | ') + ' |';
    const dataRows = rows.map((row) =>
        '| ' + row.map((cell) => {
            if (Array.isArray(cell)) return inlineContentToText(cell as Array<Record<string, unknown>>);
            return String(cell || '');
        }).join(' | ') + ' |'
    );
    return [dataRows[0], headerRow, ...dataRows.slice(1)].join('\n');
}

function downloadFile(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'untitled';
}

async function writeNativeFile(filename: string, content: string, defaultPath: string | null) {
    try {
        let path: string | null = null;

        if (defaultPath) {
            path = await join(defaultPath, filename);
        } else {
            path = await save({
                defaultPath: filename,
                title: 'Save File',
            });
        }

        if (path) {
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            await writeFile(path, data);
            return true;
        }
        return false;
    } catch (err) {
        console.error('Native write failed:', err);
        return false;
    }
}

export function useExportNote() {
    const { t } = useTranslation();
    const { preferences } = usePreferences();

    const exportAsMarkdown = useCallback(async (note: Note) => {
        const title = note.title || t('editor.untitled');
        const contentMd = note.content ? stripBlockNoteJSON(note.content) : '';
        const frontmatter = `---\ntitle: "${title}"\ncreated: ${note.created_at}\nupdated: ${note.updated_at}\nstarred: ${note.is_starred}\npinned: ${note.is_pinned}\n---\n\n`;
        const markdown = frontmatter + `# ${title}\n\n` + contentMd;

        const filename = `${sanitizeFilename(title)}.md`;

        // Check for Tauri
        if (window && (window as any).__TAURI_INTERNALS__) {
            const success = await writeNativeFile(filename, markdown, preferences.storage.exportPath);
            if (success) {
                toast.success(t('editor.export_note'));
                return;
            }
        }

        downloadFile(filename, markdown, 'text/markdown');
        toast.success(t('editor.export_note'));
    }, [t, preferences.storage.exportPath]);

    return { exportAsMarkdown };
}

export function useExportWorkspace() {
    const adapter = useDataAdapter();
    const { t } = useTranslation();
    const { preferences } = usePreferences();

    const exportAsJSON = useCallback(async () => {
        try {
            const notes = await adapter.notes.getAll();
            const archived = await adapter.notes.getArchived();
            const tags = await adapter.tags.getAll();
            const profile = await adapter.profile.get();

            const allNotes = [...notes, ...archived];

            const noteTags: Record<string, string[]> = {};
            for (const note of allNotes) {
                const nt = await adapter.noteTags.getByNoteId(note.id);
                noteTags[note.id] = nt.map((t) => t.tag.name);
            }

            const exportData = {
                version: 1,
                exported_at: new Date().toISOString(),
                profile,
                tags,
                notes: allNotes.map((n) => ({
                    ...n,
                    tags: noteTags[n.id] || [],
                })),
            };

            const json = JSON.stringify(exportData, null, 2);
            const filename = 'bloom-workspace.json';

            // Check for Tauri
            if (window && (window as any).__TAURI_INTERNALS__) {
                const success = await writeNativeFile(filename, json, preferences.storage.exportPath);
                if (success) {
                    toast.success(t('settings.export_workspace'));
                    return;
                }
            }

            downloadFile(filename, json, 'application/json');
            toast.success(t('settings.export_workspace'));
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Export failed');
        }
    }, [adapter, t, preferences.storage.exportPath]);

    const exportAllAsMarkdown = useCallback(async () => {
        try {
            const notes = await adapter.notes.getAll();
            const archived = await adapter.notes.getArchived();
            const allNotes = [...notes, ...archived];

            if (allNotes.length === 0) {
                toast.error('No notes to export');
                return;
            }

            let targetFolder = preferences.storage.exportPath;

            // Prompt for directory if no default set
            if (!targetFolder && window && (window as any).__TAURI_INTERNALS__) {
                const selected = await openDialog({
                    directory: true,
                    multiple: false,
                    title: 'Select Export Directory',
                });
                if (selected && typeof selected === 'string') {
                    targetFolder = selected;
                } else {
                    return; // User cancelled
                }
            }

            if (targetFolder) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const exportDir = await join(targetFolder, `bloom-export-${timestamp}`);

                await mkdir(exportDir, { recursive: true });

                for (const note of allNotes) {
                    const title = note.title || t('editor.untitled');
                    const contentMd = note.content ? stripBlockNoteJSON(note.content) : '';
                    const frontmatter = `---\ntitle: "${title}"\ncreated: ${note.created_at}\nupdated: ${note.updated_at}\nstarred: ${note.is_starred}\npinned: ${note.is_pinned}\n---\n\n`;
                    const markdown = frontmatter + `# ${title}\n\n` + contentMd;

                    const filename = `${sanitizeFilename(title)}.md`;
                    const filePath = await join(exportDir, filename);

                    const encoder = new TextEncoder();
                    await writeFile(filePath, encoder.encode(markdown));
                }

                toast.success(`${allNotes.length} notes exported to ${exportDir}`);
            } else {
                toast.error('Export path required for bulk export');
            }
        } catch (error) {
            console.error('Bulk export failed:', error);
            toast.error('Bulk export failed');
        }
    }, [adapter, t, preferences.storage.exportPath]);

    return { exportAsJSON, exportAllAsMarkdown };
}
