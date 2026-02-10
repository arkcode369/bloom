import { useEffect, useRef } from 'react';
import { register, unregister, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { getCurrentWindow } from '@tauri-apps/api/window';

// Module-level singleton to prevent double registration from React Strict Mode
let globalShortcutRegistered = false;
let globalCallbackRef: (() => void) | null = null;

const SHORTCUT_KEY = 'Alt+Shift+N';

async function registerShortcut() {
  if (globalShortcutRegistered) {
    console.log('⚡ Shortcut already registered, skipping...');
    return;
  }

  try {
    // Try to unregister first (in case previous instance left it hanging)
    try {
      await unregister(SHORTCUT_KEY);
      console.log('🧹 Cleaned up previous shortcut registration');
    } catch (unregErr) {
      // Ignore - shortcut might not have been registered
    }

    await register(SHORTCUT_KEY, async (event) => {
      if (event.state === 'Pressed' && globalCallbackRef) {
        console.log('Quick Capture Shortcut Triggered');
        try {
          const window = getCurrentWindow();
          await window.show();
          await window.unminimize();
          await window.setFocus();
        } catch (windowErr) {
          console.error('Window operation failed:', windowErr);
        }
        globalCallbackRef();
      }
    });
    
    globalShortcutRegistered = true;
    console.log('✅ Global shortcuts registered successfully');
  } catch (err) {
    const errMsg = String(err).toLowerCase();
    if (errMsg.includes('already registered') || errMsg.includes('hotkey already')) {
      // Already registered at OS level, just mark our flag
      globalShortcutRegistered = true;
      console.log('⚡ Shortcut was already registered at OS level, reusing...');
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
    console.log('🧹 Global shortcuts unregistered');
  } catch (err) {
    console.debug('Unregister error (might be already unregistered):', err);
  }
}

export function useGlobalShortcuts(onQuickCapture: () => void) {
  const callbackRef = useRef(onQuickCapture);
  
  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onQuickCapture;
    globalCallbackRef = onQuickCapture;
  }, [onQuickCapture]);

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
