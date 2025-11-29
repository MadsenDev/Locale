import { app, ipcMain } from 'electron';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

type PluginSource = 'builtin' | 'user';

export type RawPluginManifest = {
  id: string;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  entry: string;
  icon?: string;
  homepage?: string;
  capabilities?: string[];
  minHostVersion?: string;
};

type PluginRecord = {
  manifest: RawPluginManifest;
  source: PluginSource;
  baseDir: string;
  entryPath: string;
  iconPath?: string;
};

type SerializedPlugin = RawPluginManifest & {
  source: PluginSource;
  iconDataUrl?: string | null;
};

const pluginRegistry = new Map<string, PluginRecord>();
let lastScan = 0;
const SCAN_INTERVAL_MS = 5_000;

const getPluginRoots = () => {
  const devRoot = path.join(process.cwd(), 'plugins');
  const userRoot = path.join(app.getPath('userData'), 'plugins');
  const packagedRoot = path.join(process.resourcesPath, 'plugins');

  const roots: Array<{ dir: string; source: PluginSource }> = [];

  if (app.isPackaged) {
    roots.push({ dir: packagedRoot, source: 'builtin' });
  } else {
    roots.push({ dir: devRoot, source: 'builtin' });
  }

  roots.push({ dir: userRoot, source: 'user' });
  return roots;
};

async function readManifest(manifestPath: string): Promise<RawPluginManifest | null> {
  try {
    const raw = await fs.readFile(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw) as RawPluginManifest;
    if (!parsed.id || !parsed.name || !parsed.entry) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function encodeIcon(iconPath?: string) {
  if (!iconPath || !existsSync(iconPath)) return null;
  try {
    const data = await fs.readFile(iconPath);
    const ext = path.extname(iconPath).replace('.', '') || 'png';
    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch {
    return null;
  }
}

async function scanPlugins(force = false) {
  const now = Date.now();
  if (!force && now - lastScan < SCAN_INTERVAL_MS) {
    return;
  }
  pluginRegistry.clear();

  for (const { dir, source } of getPluginRoots()) {
    if (!existsSync(dir)) continue;
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const baseDir = path.join(dir, entry.name);
      const manifestPath = path.join(baseDir, 'manifest.json');
      if (!existsSync(manifestPath)) continue;
      const manifest = await readManifest(manifestPath);
      if (!manifest) continue;

      const entryPath = path.resolve(baseDir, manifest.entry);
      if (!existsSync(entryPath)) continue;

      // Ensure entry path is inside plugin directory
      if (!entryPath.startsWith(baseDir)) continue;

      const iconPath = manifest.icon ? path.resolve(baseDir, manifest.icon) : undefined;

      pluginRegistry.set(manifest.id, {
        manifest,
        source,
        baseDir,
        entryPath,
        iconPath: iconPath && existsSync(iconPath) ? iconPath : undefined,
      });
    }
  }
  lastScan = Date.now();
}

export function registerPluginHandlers() {
  ipcMain.handle('plugins:list', async () => {
    await scanPlugins();
    const results: SerializedPlugin[] = [];
    for (const record of pluginRegistry.values()) {
      const iconDataUrl = await encodeIcon(record.iconPath);
      results.push({
        ...record.manifest,
        source: record.source,
        iconDataUrl,
      });
    }
    return results;
  });

  ipcMain.handle('plugins:loadBundle', async (_event, pluginId: string) => {
    await scanPlugins();
    const record = pluginRegistry.get(pluginId);
    if (!record) {
      throw new Error(`Plugin "${pluginId}" not found`);
    }
    const code = await fs.readFile(record.entryPath, 'utf-8');
    const entryUrl = pathToFileURL(record.entryPath).toString();
    return {
      id: record.manifest.id,
      code,
      entryUrl,
    };
  });

  ipcMain.handle(
    'plugins:read-file',
    async (_event, pluginId: string, relativePath: string, encoding: BufferEncoding = 'utf-8') => {
      await scanPlugins();
      const record = pluginRegistry.get(pluginId);
      if (!record) {
        throw new Error(`Plugin "${pluginId}" not found`);
      }
      const resolved = path.resolve(record.baseDir, relativePath);
      if (!resolved.startsWith(record.baseDir)) {
        throw new Error('Access to the requested asset is not allowed.');
      }
      const data = await fs.readFile(resolved, encoding);
      return data;
    }
  );
}

