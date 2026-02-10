import {
  mkdir,
  writeFile,
  readFile,
  exists,
  BaseDirectory
} from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { generateUUID } from './sqlite-db';

/**
 * Local Asset Manager
 * 
 * Handles saving and retrieving local files (images, attachments)
 * in the application's data directory.
 */

const ASSETS_DIR = 'assets';

function getMediaPath(): string | null {
  try {
    const saved = localStorage.getItem('preferences');
    if (saved) {
      const prefs = JSON.parse(saved);
      return prefs?.storage?.mediaPath || null;
    }
  } catch (err) {
    console.error('Failed to get media path from preferences:', err);
  }
  return null;
}

export async function ensureAssetsDirectory() {
  try {
    const customPath = getMediaPath();
    if (customPath) {
      const targetDir = await join(customPath, ASSETS_DIR);
      const targetExists = await exists(targetDir);
      if (!targetExists) {
        await mkdir(targetDir, { recursive: true });
        console.log('Created assets directory in custom path:', targetDir);
      }
    } else {
      const assetsPathExists = await exists(ASSETS_DIR, { baseDir: BaseDirectory.AppData });
      if (!assetsPathExists) {
        await mkdir(ASSETS_DIR, {
          baseDir: BaseDirectory.AppData,
          recursive: true
        });
        console.log('Created assets directory in AppData');
      }
    }
  } catch (err) {
    console.error('Failed to ensure assets directory:', err);
  }
}

/**
 * Saves a file to the local assets directory.
 * @param file The file to save (File object from input or drop)
 * @returns The local path/identifier of the saved asset
 */
export async function saveAsset(file: File): Promise<string> {
  await ensureAssetsDirectory();

  const extension = file.name.split('.').pop() || '';
  const assetId = `${generateUUID()}.${extension}`;
  const customPath = getMediaPath();

  let assetPath: string;
  if (customPath) {
    assetPath = await join(customPath, ASSETS_DIR, assetId);
  } else {
    assetPath = await join(ASSETS_DIR, assetId);
  }

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  if (customPath) {
    await writeFile(assetPath, uint8Array);
  } else {
    await writeFile(assetPath, uint8Array, { baseDir: BaseDirectory.AppData });
  }

  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'pdf': 'application/pdf',
  };
  const mime = mimeTypes[extension.toLowerCase()] || file.type || 'application/octet-stream';

  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);
  return `data:${mime};base64,${base64}`;
}

/**
 * Gets the actual filesystem path for an asset ID.
 */
export async function getAssetPath(assetId: string): Promise<string> {
  const customPath = getMediaPath();
  if (customPath) {
    return await join(customPath, ASSETS_DIR, assetId);
  }
  const appData = await appDataDir();
  return await join(appData, ASSETS_DIR, assetId);
}

/**
 * Converts an asset:// URL to a data URL for display if needed,
 * though custom protocols are preferred in Tauri.
 */
export async function assetToDataUrl(assetUrl: string): Promise<string> {
  if (!assetUrl.startsWith('asset://')) return assetUrl;

  const assetId = assetUrl.replace('asset://', '');
  const customPath = getMediaPath();

  try {
    let content: Uint8Array;
    if (customPath) {
      const assetPath = await join(customPath, ASSETS_DIR, assetId);
      content = await readFile(assetPath);
    } else {
      const assetPath = await join(ASSETS_DIR, assetId);
      content = await readFile(assetPath, { baseDir: BaseDirectory.AppData });
    }

    const ext = assetId.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
    };
    const mime = mimeTypes[ext] || 'application/octet-stream';

    const bytes = new Uint8Array(content);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.error('Failed to convert asset to data URL:', err);
    return assetUrl;
  }
}
