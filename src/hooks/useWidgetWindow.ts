import { useEffect, useRef } from 'react';
import { useActiveTimeBlock } from './useActiveTimeBlock';
import { usePreferences } from './usePreferences';

let widgetWindow: any = null;
let isCreating = false;

async function createWidgetWindow() {
  if (widgetWindow || isCreating) return;
  isCreating = true;

  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');

    // Check if window already exists (e.g. from previous session)
    const existing = await WebviewWindow.getByLabel('planner-widget');
    if (existing) {
      widgetWindow = existing;
      await existing.show();
      await existing.setFocus();
      isCreating = false;
      return;
    }

    widgetWindow = new WebviewWindow('planner-widget', {
      url: '/widget',
      title: 'Bloom Planner',
      width: 280,
      height: 400,
      resizable: false,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      center: false,
      x: window.screen.availWidth - 300,
      y: window.screen.availHeight - 440,
    });

    widgetWindow.once('tauri://error', () => {
      widgetWindow = null;
      isCreating = false;
    });

    widgetWindow.once('tauri://created', () => {
      isCreating = false;
    });

    widgetWindow.once('tauri://destroyed', () => {
      widgetWindow = null;
      isCreating = false;
    });
  } catch (e) {
    console.error('Failed to create widget window:', e);
    widgetWindow = null;
    isCreating = false;
  }
}

async function showWidgetWindow() {
  if (!widgetWindow) {
    await createWidgetWindow();
  } else {
    try {
      await widgetWindow.show();
    } catch {
      // Window may have been destroyed, recreate
      widgetWindow = null;
      await createWidgetWindow();
    }
  }
}

async function hideWidgetWindow() {
  if (widgetWindow) {
    try {
      await widgetWindow.hide();
    } catch {
      widgetWindow = null;
    }
  }
}

export function useWidgetWindow() {
  const activeInfo = useActiveTimeBlock();
  const { preferences } = usePreferences();
  const wasActive = useRef(false);
  const startupDone = useRef(false);

  // Show widget on startup if preference is enabled
  useEffect(() => {
    if (!startupDone.current && preferences.widget.showWidgetOnStartup) {
      startupDone.current = true;
      showWidgetWindow();
    }
  }, [preferences.widget.showWidgetOnStartup]);

  // Auto show/hide based on active timeblock
  useEffect(() => {
    const isActive = activeInfo.isActive;

    if (isActive && !wasActive.current) {
      showWidgetWindow();
    } else if (!isActive && wasActive.current && !preferences.widget.showWidgetOnStartup) {
      // Only auto-hide if not set to show on startup (persistent mode)
      hideWidgetWindow();
    }

    wasActive.current = isActive;
  }, [activeInfo.isActive, preferences.widget.showWidgetOnStartup]);

  return {
    isWidgetVisible: activeInfo.isActive || preferences.widget.showWidgetOnStartup,
    showWidget: showWidgetWindow,
    hideWidget: hideWidgetWindow,
  };
}
