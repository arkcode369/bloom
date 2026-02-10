import React from 'react';
import { useStorageStats } from '@/hooks/useStorageStats';
import { Progress } from '@/components/ui/progress';
import { HardDrive, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function StorageUsage() {
  const { totalFormatted, noteStats, isLoading } = useStorageStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const topNotes = noteStats.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Total Storage */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <HardDrive className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Storage Used</p>
            <p className="text-2xl font-semibold">{totalFormatted}</p>
          </div>
        </div>
      </div>

      {/* Notes by Size */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Top Notes by Size
        </h4>

        {topNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notes yet. Create your first note to see storage usage.
          </p>
        ) : (
          <div className="space-y-2">
            {topNotes.map((note, index) => (
              <motion.div
                key={note.noteId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium truncate flex-1 mr-2">
                    {note.title}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {note.sizeFormatted}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={note.percentage} 
                    className="h-1.5 flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {note.percentage.toFixed(1)}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {noteStats.length > 10 && (
          <p className="text-xs text-muted-foreground text-center">
            Showing top 10 of {noteStats.length} notes
          </p>
        )}
      </div>
    </div>
  );
}
