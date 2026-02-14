import { useEffect, useRef, useState, useCallback } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';
import { toast } from 'sonner';

export interface UpdateStatus {
  /** Current app version */
  currentVersion: string;
  /** Whether an update check is in progress */
  checking: boolean;
  /** Whether an update is being downloaded */
  downloading: boolean;
  /** Download progress 0-100 */
  progress: number;
  /** Whether an update has been downloaded and is ready to install */
  readyToInstall: boolean;
  /** The latest available version (if any) */
  availableVersion: string | null;
  /** Last error message */
  error: string | null;
  /** Manually trigger an update check */
  checkNow: () => Promise<void>;
  /** Install the downloaded update and relaunch */
  installAndRelaunch: () => Promise<void>;
}

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

/** Build auth headers for private repo access (token injected at build time) */
function getUpdaterHeaders(): Record<string, string> | undefined {
  const token = import.meta.env.VITE_UPDATER_TOKEN;
  if (token) {
    return { Authorization: `token ${token}` };
  }
  return undefined;
}

/**
 * Silent auto-update hook.
 * - Checks for updates on mount and every 4 hours
 * - Downloads updates silently in the background
 * - Shows a toast when update is ready, user can restart when convenient
 * - Supports private GitHub repos via VITE_UPDATER_TOKEN env var
 */
export function useAutoUpdate(): UpdateStatus {
  const [currentVersion, setCurrentVersion] = useState('');
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [readyToInstall, setReadyToInstall] = useState(false);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const updateRef = useRef<Update | null>(null);

  // Get current version on mount
  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(() => setCurrentVersion('unknown'));
  }, []);

  const performCheck = useCallback(async () => {
    // Don't check if already checking or downloading
    if (checking || downloading || readyToInstall) return;

    try {
      setChecking(true);
      setError(null);

      const update = await check({ headers: getUpdaterHeaders() });

      if (update) {
        setAvailableVersion(update.version);
        updateRef.current = update;
        console.log(`[AutoUpdate] Update available: v${update.version}`);

        // Start silent download
        setDownloading(true);
        setChecking(false);

        let totalBytes = 0;
        let downloadedBytes = 0;

        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              totalBytes = event.data.contentLength ?? 0;
              console.log(`[AutoUpdate] Download started (${totalBytes} bytes)`);
              break;
            case 'Progress':
              downloadedBytes += event.data.chunkLength;
              if (totalBytes > 0) {
                setProgress(Math.round((downloadedBytes / totalBytes) * 100));
              }
              break;
            case 'Finished':
              console.log('[AutoUpdate] Download finished');
              break;
          }
        }, { headers: getUpdaterHeaders() });

        setDownloading(false);
        setReadyToInstall(true);
        setProgress(100);

        // Show a subtle toast notification
        toast.success(`Update v${update.version} ready`, {
          description: 'Restart the app to apply the update.',
          duration: 10000,
          action: {
            label: 'Restart Now',
            onClick: () => {
              relaunch().catch(console.error);
            },
          },
        });
      } else {
        console.log('[AutoUpdate] App is up to date');
        setChecking(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[AutoUpdate] Check failed:', msg);
      setError(msg);
      setChecking(false);
      setDownloading(false);
    }
  }, [checking, downloading, readyToInstall]);

  const installAndRelaunch = useCallback(async () => {
    try {
      await relaunch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AutoUpdate] Relaunch failed:', msg);
      setError(msg);
    }
  }, []);

  // Check on mount (after a short delay to not block startup)
  useEffect(() => {
    const timeout = setTimeout(() => {
      performCheck();
    }, 5000); // 5s after startup

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic check every 4 hours
  useEffect(() => {
    const interval = setInterval(() => {
      performCheck();
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [performCheck]);

  return {
    currentVersion,
    checking,
    downloading,
    progress,
    readyToInstall,
    availableVersion,
    error,
    checkNow: performCheck,
    installAndRelaunch,
  };
}
