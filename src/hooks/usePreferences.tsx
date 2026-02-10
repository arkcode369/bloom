import React, { createContext, useContext, useEffect, useState } from 'react';

export interface EditorPreferences {
  fontSize: 'small' | 'medium' | 'large';
  autoSaveInterval: number; // in seconds
  isFullWidth: boolean;
}

export interface StoragePreferences {
  exportPath: string | null;
  mediaPath: string | null;
}

export interface AppPreferences {
  editor: EditorPreferences;
  storage: StoragePreferences;
}

const defaultPreferences: AppPreferences = {
  editor: {
    fontSize: 'medium',
    autoSaveInterval: 3,
    isFullWidth: false,
  },
  storage: {
    exportPath: null,
    mediaPath: null,
  },
};

interface PreferencesContextType {
  preferences: AppPreferences;
  updateEditorPreference: <K extends keyof EditorPreferences>(
    key: K,
    value: EditorPreferences[K]
  ) => void;
  updateStoragePreference: <K extends keyof StoragePreferences>(
    key: K,
    value: StoragePreferences[K]
  ) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AppPreferences>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preferences');
      if (saved) {
        try {
          return { ...defaultPreferences, ...JSON.parse(saved) };
        } catch {
          return defaultPreferences;
        }
      }
    }
    return defaultPreferences;
  });

  useEffect(() => {
    localStorage.setItem('preferences', JSON.stringify(preferences));
  }, [preferences]);

  // Apply font size to document
  useEffect(() => {
    const root = document.documentElement;
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.setProperty('--editor-font-size', fontSizes[preferences.editor.fontSize]);
  }, [preferences.editor.fontSize]);

  const updateEditorPreference = <K extends keyof EditorPreferences>(
    key: K,
    value: EditorPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      editor: {
        ...prev.editor,
        [key]: value,
      },
    }));
  };

  const updateStoragePreference = <K extends keyof StoragePreferences>(
    key: K,
    value: StoragePreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      storage: {
        ...prev.storage,
        [key]: value,
      },
    }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
  };

  return (
    <PreferencesContext.Provider value={{ preferences, updateEditorPreference, updateStoragePreference, resetPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
