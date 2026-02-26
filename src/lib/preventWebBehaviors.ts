/**
 * Disable browser/web-native behaviors that are irrelevant in a desktop app.
 * Called once at app startup (main.tsx).
 */
export function preventWebBehaviors(): void {
  // --- Keyboard shortcuts ---
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;

    // Ctrl+P → Print
    if (ctrl && e.key === 'p') { e.preventDefault(); return; }

    // Ctrl+S → Save page
    if (ctrl && e.key === 's') { e.preventDefault(); return; }

    // Ctrl+R / F5 → Refresh
    if ((ctrl && e.key === 'r') || e.key === 'F5') { e.preventDefault(); return; }

    // Ctrl+Shift+R / Ctrl+F5 → Hard refresh
    if ((ctrl && e.shiftKey && e.key === 'r') || (ctrl && e.key === 'F5')) { e.preventDefault(); return; }

    // Ctrl+U → View source
    if (ctrl && e.key === 'u') { e.preventDefault(); return; }

    // Ctrl+G / F3 → Browser find-next
    if ((ctrl && e.key === 'g') || e.key === 'F3') { e.preventDefault(); return; }

    // Alt+Left / Alt+Right → Browser back/forward navigation
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); return; }

    // F1 → Browser help
    if (e.key === 'F1') { e.preventDefault(); return; }

    // F7 → Caret browsing
    if (e.key === 'F7') { e.preventDefault(); return; }
  }, true); // capture phase so it fires before React handlers

  // --- Right-click context menu (browser default) ---
  document.addEventListener('contextmenu', (e) => {
    // Allow context menu on text inputs / textareas for paste/cut/copy
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    e.preventDefault();
  });

  // --- Drag-and-drop onto window (would navigate the webview) ---
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());
}
