import { useState, useCallback } from 'react';

export function useDialogs() {
    const [showSearchDialog, setShowSearchDialog] = useState(false);
    const [showGraphDialog, setShowGraphDialog] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showArchive, setShowArchive] = useState(false);
    const [showQuickCapture, setShowQuickCapture] = useState(false);
    const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

    const openSearch = useCallback(() => setShowSearchDialog(true), []);
    const openGraph = useCallback(() => setShowGraphDialog(true), []);
    const openCommandPalette = useCallback(() => setShowCommandPalette(true), []);
    const openSettings = useCallback(() => setShowSettings(true), []);
    const openArchive = useCallback(() => setShowArchive(true), []);
    const openQuickCapture = useCallback(() => setShowQuickCapture(true), []);

    return {
        showSearchDialog,
        setShowSearchDialog,
        showGraphDialog,
        setShowGraphDialog,
        showCommandPalette,
        setShowCommandPalette,
        showSettings,
        setShowSettings,
        showArchive,
        setShowArchive,
        showQuickCapture,
        setShowQuickCapture,
        deleteNoteId,
        setDeleteNoteId,
        openSearch,
        openGraph,
        openCommandPalette,
        openSettings,
        openArchive,
        openQuickCapture,
    };
}
