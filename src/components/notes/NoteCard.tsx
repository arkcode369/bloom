import React from 'react';
import { Note } from '@/hooks/useNotes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, MoreVertical, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { getContentPreview } from '@/components/editor/blockUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NoteCardProps {
  note: Note;
  isSelected?: boolean;
  onClick: () => void;
  onToggleStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
  index?: number;
}

export default function NoteCard({
  note,
  isSelected,
  onClick,
  onToggleStar,
  onArchive,
  onDelete,
  index = 0,
}: NoteCardProps) {
  // Get a preview of the content (first 100 chars)
  const preview = getContentPreview(note.content, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Card
        className={cn(
          'group cursor-pointer transition-all duration-200 hover:shadow-soft border-2',
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-transparent hover:border-primary/20'
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h3 className="font-medium text-sm truncate">{note.title}</h3>
              </div>
              {preview && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {preview}...
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
              </p>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <motion.div whileTap={{ scale: 0.85 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar();
                  }}
                >
                  <motion.div
                    animate={note.is_starred ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Star
                      className={cn(
                        'h-4 w-4 transition-colors',
                        note.is_starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
                      )}
                    />
                  </motion.div>
                </Button>
              </motion.div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar();
                  }}>
                    {note.is_starred ? 'Remove star' : 'Add star'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onArchive();
                  }}>
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
