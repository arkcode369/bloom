import { useEffect, useRef } from 'react';
import { register, unregister, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { getCurrentWindow } from '@tauri-apps/api/window';

// Module-level singleton to prevent double registration from React Strict Mode
let globalShortcutRegistered = false;
let globalCallbackRef: (() => void) | null = null;
let useWidgetModeRef = false;

const SHORTCUT_KEY = 'Alt+Shift+N';

async function openQuickCaptureWidget() {
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const existing = await WebviewWindow.getByLabel('quick-capture');
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }
    new WebviewWindow('quick-capture', {
      url: '/quick-capture',
      title: 'Quick Capture',
      width: 340,
      height: 220,
      resizable: false,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      center: true,
    });
  } catch {
    // Fallback: ignore
  }
}

async function registerShortcut() {
  if (globalShortcutRegistered) {
    return;
  }

  try {
    // Try to unregister first (in case previous instance left it hanging)
    try {
      await unregister(SHORTCUT_KEY);
    } catch (unregErr) {
      // Ignore - shortcut might not have been registered
    }

    await register(SHORTCUT_KEY, async (event) => {
      if (event.state === 'Pressed') {
        if (useWidgetModeRef) {
          // Open quick capture as a standalone widget
          await openQuickCaptureWidget();
        } else {
          // Open main app and trigger quick capture
          try {
            const window = getCurrentWindow();
            await window.show();
            await window.unminimize();
            await window.setFocus();
          } catch (windowErr) {
            console.error('Window operation failed:', windowErr);
          }
          if (globalCallbackRef) {
            globalCallbackRef();
          }
        }
      }
    });
    
    globalShortcutRegistered = true;
  } catch (err) {
    const errMsg = String(err).toLowerCase();
    if (errMsg.includes('already registered') || errMsg.includes('hotkey already')) {
      globalShortcutRegistered = true;
    } else {
      console.error('Failed to register global shortcuts:', err);
    }
  }
}

async function unregisterShortcut() {
  if (!globalShortcutRegistered) return;
  
  try {
    await unregister(SHORTCUT_KEY);
    globalShortcutRegistered = false;
  } catch (err) {
    console.debug('Unregister error (might be already unregistered):', err);
  }
}

export function useGlobalShortcuts(onQuickCapture: () => void, quickCaptureAsWidget = false) {
  const callbackRef = useRef(onQuickCapture);
  
  // Keep refs updated
  useEffect(() => {
    callbackRef.current = onQuickCapture;
    globalCallbackRef = onQuickCapture;
    useWidgetModeRef = quickCaptureAsWidget;
  }, [onQuickCapture, quickCaptureAsWidget]);

  useEffect(() => {
    // Set global callback
    globalCallbackRef = callbackRef.current;
    
    // Register shortcut (singleton - only registers once)
    registerShortcut();

    // Cleanup: only unregister on actual unmount, not Strict Mode remount
    return () => {
      // Don't unregister here - let app lifecycle handle it
      // This prevents issues with React Strict Mode double-mount
    };
  }, []);
}

// Export for app-level cleanup (e.g., on window close)
export { unregisterShortcut };
