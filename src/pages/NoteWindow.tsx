import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNote, useToggleStar, useArchiveNote, useDeleteNote } from '@/hooks/useNotes';
import NoteEditor from '@/components/notes/NoteEditor';
import { Loader2 } from 'lucide-react';

export default function NoteWindow() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { data: note, isLoading } = useNote(id || null);
    const toggleStar = useToggleStar();
    const archiveNote = useArchiveNote();
    const deleteNote = useDeleteNote();

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!note) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">Note not found</p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-background overflow-hidden">
            <NoteEditor
                note={note}
                onToggleStar={() => toggleStar.mutate({
                    id: note.id,
                    is_starred: !note.is_starred
                })}
                onArchive={() => {
                    archiveNote.mutate(note.id);
                    // Close window?
                    window.close();
                }}
                onDelete={() => {
                    if (confirm('Are you sure you want to delete this note?')) {
                        deleteNote.mutate(note.id);
                        window.close();
                    }
                }}
                onNavigateToNote={(id) => {
                    navigate(`/note/${id}`);
                }}
            />
        </div>
    );
}
