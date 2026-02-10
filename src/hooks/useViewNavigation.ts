import { useState, useCallback } from 'react';

export type ViewMode = 'home' | 'all' | 'starred' | 'tag' | 'note';

export function useViewNavigation() {
    const [viewMode, setViewMode] = useState<ViewMode>('home');
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

    const handleGoHome = useCallback(() => {
        setSelectedNoteId(null);
        setSelectedTagId(null);
        setViewMode('home');
    }, []);

    const handleViewAllNotes = useCallback(() => {
        setSelectedNoteId(null);
        setSelectedTagId(null);
        setViewMode('all');
    }, []);

    const handleViewStarred = useCallback(() => {
        setSelectedNoteId(null);
        setSelectedTagId(null);
        setViewMode('starred');
    }, []);

    const handleSelectTag = useCallback((tagId: string | null) => {
        if (tagId) {
            setSelectedTagId(tagId);
            setSelectedNoteId(null);
            setViewMode('tag');
        } else {
            setSelectedTagId(null);
            setViewMode('home');
        }
    }, []);

    const handleSelectNote = useCallback((noteId: string) => {
        setSelectedNoteId(noteId);
        setViewMode('note');
    }, []);

    return {
        viewMode,
        setViewMode,
        selectedNoteId,
        setSelectedNoteId,
        selectedTagId,
        setSelectedTagId,
        handleGoHome,
        handleViewAllNotes,
        handleViewStarred,
        handleSelectTag,
        handleSelectNote,
    };
}
