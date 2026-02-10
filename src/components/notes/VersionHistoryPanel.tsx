import React from 'react';
import { useNoteVersions, useRestoreVersion } from '@/hooks/useNotes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { History, RotateCcw, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getContentPreview } from '@/components/editor/blockUtils';

interface VersionHistoryPanelProps {
    noteId: string;
    onClose: () => void;
}

export default function VersionHistoryPanel({ noteId, onClose }: VersionHistoryPanelProps) {
    const { data: versions, isLoading } = useNoteVersions(noteId);
    const restoreVersion = useRestoreVersion();

    const handleRestore = async (versionId: string) => {
        if (confirm('Are you sure you want to restore this version? Current changes will be saved as a new version if 5 mins have passed.')) {
            await restoreVersion.mutateAsync({ noteId, versionId });
        }
    };

    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-72 border-l bg-card flex flex-col h-full overflow-hidden"
        >
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">Version History</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                    ×
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : versions?.length === 0 ? (
                        <div className="text-center py-8">
                            <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">No versions saved yet.</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                                Versions are saved automatically every 5 minutes when you make changes.
                            </p>
                        </div>
                    ) : (
                        versions?.map((version) => (
                            <div
                                key={version.id}
                                className="group p-3 rounded-lg border bg-background hover:border-primary/50 transition-all shadow-sm"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-foreground">
                                            {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {new Date(version.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleRestore(version.id)}
                                        disabled={restoreVersion.isPending}
                                        title="Restore this version"
                                    >
                                        {restoreVersion.isPending ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <RotateCcw className="h-3 w-3 text-primary" />
                                        )}
                                    </Button>
                                </div>
                                <div className="text-[11px] text-muted-foreground line-clamp-2 italic">
                                    {version.title || 'Untitled'}
                                </div>
                                {version.content && (
                                    <div className="mt-2 text-[10px] text-muted-foreground/70 line-clamp-2">
                                        {getContentPreview(version.content, 100)}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
            <div className="p-3 border-t bg-muted/10">
                <p className="text-[10px] text-muted-foreground leading-tight">
                    Snapshots are captured automatically during editing to ensure your work is never lost.
                </p>
            </div>
        </motion.div>
    );
}
