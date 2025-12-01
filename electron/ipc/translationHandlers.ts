import { ipcMain, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';

type TranslationSettings = {
  provider: 'deepl' | 'google' | 'openai';
  apiKey: string;
  apiUrl?: string;
  region?: string;
  model?: string;
  targetLocales?: string[];
};

type AppSettings = {
  translation?: TranslationSettings;
};

type TranslationSyncResult = {
  updatedFiles: number;
  translatedKeys: number;
  skippedFiles: number;
  details: Array<{
    locale: string;
    path: string;
    translated: number;
    status: 'updated' | 'skipped' | 'error';
    error?: string;
  }>;
};

type FlatStringEntry = {
  key: string;
  value: string;
};

type LocaleTarget = {
  code: string;
  path: string;
};

type TranslationProgressEvent = {
  locale: string;
  status: 'pending' | 'updated' | 'skipped' | 'error';
  translated?: number;
  total?: number;
  message?: string;
  error?: string;
};

const SETTINGS_FILE = 'locroot-settings.json';
const LEGACY_SETTINGS_FILE = 'localeforge-settings.json';

let resolveSettingsPath: () => string = () => path.join(process.cwd(), SETTINGS_FILE);
let resolveLegacySettingsPath: () => string = () => path.join(process.cwd(), LEGACY_SETTINGS_FILE);

export function registerTranslationHandlers(
  getMainWindow: () => BrowserWindow | null,
  getUserDataPath: () => string
) {
  resolveSettingsPath = () => path.join(getUserDataPath(), SETTINGS_FILE);
  resolveLegacySettingsPath = () => path.join(getUserDataPath(), LEGACY_SETTINGS_FILE);

  ipcMain.handle('translation:settings:get', async () => {
    const data = await readSettings();
    return data.translation ?? null;
  });

  ipcMain.handle('translation:settings:save', async (_event, payload: TranslationSettings | null) => {
    const next: AppSettings = payload ? { translation: payload } : {};
    await writeSettings(next);
    return next.translation ?? null;
  });

  ipcMain.handle('translation:sync', async (_event, payload: { basePath: string; languageDir: string }) => {
    const settings = await readSettings();
    if (!settings.translation?.apiKey) {
      throw new Error('No translation provider configured.');
    }

    const normalizedBase = path.resolve(payload.basePath);
    const targetLocales = settings.translation.targetLocales?.map((locale) => locale.trim()).filter(Boolean) ?? [];

    let localeTargets: LocaleTarget[];
    if (targetLocales.length > 0) {
      localeTargets = await prepareTargetLocales(normalizedBase, payload.languageDir, targetLocales);
    } else {
      const entries = await fs.readdir(payload.languageDir, { withFileTypes: true });
      localeTargets = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
        .map((entry) => {
          const filePath = path.join(payload.languageDir, entry.name);
          return {
            code: detectLanguageFromPath(filePath, ''),
            path: filePath,
          };
        })
        .filter((target) => path.resolve(target.path) !== normalizedBase);
    }

    const results = await translateLocales(normalizedBase, localeTargets, settings.translation, (event) => {
      getMainWindow()?.webContents.send('translation:progress', event);
    });
    return results;
  });

  ipcMain.handle(
    'translation:models:list',
    async (_event, payload: { provider: TranslationSettings['provider']; apiKey: string; apiUrl?: string }) => {
      if (payload.provider !== 'openai') {
        return [];
      }

      if (!payload.apiKey.trim()) {
        throw new Error('API key is required to fetch models.');
      }

      const endpointBase = (payload.apiUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
      const endpoint = `${endpointBase}/models`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${payload.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch OpenAI models (${response.status}): ${errorText}`);
      }

      const json = (await response.json()) as {
        data?: { id: string; object: string }[];
      };

      const models = json.data?.map((entry) => entry.id) ?? [];
      return models;
    }
  );
}

function getSettingsPath() {
  return resolveSettingsPath();
}

function getLegacySettingsPath() {
  return resolveLegacySettingsPath();
}

async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    try {
      const legacyRaw = await fs.readFile(getLegacySettingsPath(), 'utf8');
      const parsed = JSON.parse(legacyRaw);
      await writeSettings(parsed);
      return parsed;
    } catch {
      return {};
    }
  }
}

async function writeSettings(next: AppSettings) {
  const filePath = getSettingsPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(next, null, 2), 'utf8');
}

async function readJsonFile(filePath: string): Promise<Record<string, any>> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function extractStringEntries(source: any, prefix = '', acc: FlatStringEntry[] = []): FlatStringEntry[] {
  if (typeof source === 'string') {
    acc.push({ key: prefix, value: source });
    return acc;
  }

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return acc;
  }

  Object.entries(source).forEach(([childKey, childValue]) => {
    const nextKey = prefix ? `${prefix}.${childKey}` : childKey;
    extractStringEntries(childValue, nextKey, acc);
  });

  return acc;
}

function applyNestedValue(target: Record<string, any>, dottedKey: string, value: string) {
  const parts = dottedKey.split('.');
  let cursor: Record<string, any> = target;

  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      cursor[part] = value;
    } else {
      cursor[part] = cursor[part] ?? {};
      cursor = cursor[part];
    }
  });
}

function detectLanguageFromPath(filePath: string, fallback: string) {
  const name = path.basename(filePath, path.extname(filePath));
  const match = name.toLowerCase().match(/[a-z]{2,}(-[a-z0-9]+)?/);
  return (match?.[0] ?? fallback).toUpperCase();
}

async function prepareTargetLocales(basePath: string, languageDir: string, locales: string[]): Promise<LocaleTarget[]> {
  const baseName = path.basename(basePath, path.extname(basePath)).toLowerCase();
  const targets: LocaleTarget[] = [];

  for (const locale of locales) {
    const safeCode = locale.trim();
    if (!safeCode) continue;
    if (safeCode.toLowerCase() === baseName) continue;

    const fileName = safeCode.endsWith('.json') ? safeCode : `${safeCode}.json`;
    const filePath = path.join(languageDir, fileName);
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify({}, null, 2), 'utf8');
    }

    targets.push({ code: safeCode, path: filePath });
  }

  return targets;
}

async function translateLocales(
  basePath: string,
  localeTargets: LocaleTarget[],
  settings: TranslationSettings,
  emit: (event: TranslationProgressEvent) => void
): Promise<TranslationSyncResult> {
  const baseData = await readJsonFile(basePath);
  const baseEntries = extractStringEntries(baseData);
  const baseLang = detectLanguageFromPath(basePath, 'EN');

  let translatedKeys = 0;
  let updatedFiles = 0;
  let skippedFiles = 0;
  const details: TranslationSyncResult['details'] = [];

  for (const target of localeTargets) {
    try {
      const localeData = await readJsonFile(target.path);
      const localeEntries = extractStringEntries(localeData);
      const existingKeys = new Set(localeEntries.map((entry) => entry.key));
      const missingEntries = baseEntries.filter(
        (entry) => !existingKeys.has(entry.key) && entry.value.trim().length > 0
      );

      emit({
        locale: target.code,
        status: 'pending',
        total: missingEntries.length,
        translated: 0,
      });

      if (missingEntries.length === 0) {
        skippedFiles += 1;
        details.push({
          locale: target.code,
          path: target.path,
          translated: 0,
          status: 'skipped',
        });
        emit({
          locale: target.code,
          status: 'skipped',
          translated: 0,
          total: 0,
        });
        continue;
      }

      const targetLang = target.code ? target.code.toUpperCase() : detectLanguageFromPath(target.path, baseLang);
      let translatedSoFar = 0;
      const translations = await translateEntries(
        missingEntries,
        baseLang,
        targetLang,
        settings,
        target,
        (chunkCount) => {
          translatedSoFar = Math.min(translatedSoFar + chunkCount, missingEntries.length);
          emit({
            locale: target.code,
            status: 'pending',
            translated: translatedSoFar,
            total: missingEntries.length,
          });
        }
      );

      translations.forEach((value, index) => {
        const source = missingEntries[index];
        applyNestedValue(localeData, source.key, value);
      });

      await fs.writeFile(target.path, JSON.stringify(localeData, null, 2), 'utf8');
      translatedKeys += translations.length;
      updatedFiles += 1;
      details.push({
        locale: target.code,
        path: target.path,
        translated: translations.length,
        status: 'updated',
      });
      emit({
        locale: target.code,
        status: 'updated',
        translated: translations.length,
        total: missingEntries.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      details.push({
        locale: target.code,
        path: target.path,
        translated: 0,
        status: 'error',
        error: message,
      });
      emit({
        locale: target.code,
        status: 'error',
        translated: 0,
        total: 0,
        message,
        error: message,
      });
    }
  }

  emit({
    locale: '__complete__',
    status: 'updated',
    message: 'Translation run completed',
  });

  return {
    updatedFiles,
    translatedKeys,
    skippedFiles,
    details,
  };
}

async function translateEntries(
  entries: FlatStringEntry[],
  sourceLang: string,
  targetLang: string,
  settings: TranslationSettings,
  localeTarget: LocaleTarget,
  onChunkTranslated?: (chunkCount: number) => void
): Promise<string[]> {
  switch (settings.provider) {
    case 'deepl':
      return translateWithDeepL(entries, sourceLang, targetLang, settings, onChunkTranslated);
    case 'google':
      return translateWithGoogle(entries, sourceLang, targetLang, settings, onChunkTranslated);
    case 'openai':
      return translateWithOpenAI(entries, sourceLang, targetLang, settings, localeTarget, onChunkTranslated);
    default:
      throw new Error(`Translation provider "${settings.provider}" is not supported yet.`);
  }
}

async function translateWithDeepL(
  entries: FlatStringEntry[],
  sourceLang: string,
  targetLang: string,
  settings: TranslationSettings,
  onChunkTranslated?: (chunkCount: number) => void
): Promise<string[]> {
  const endpointBase = (settings.apiUrl ?? 'https://api-free.deepl.com').replace(/\/$/, '');
  const endpoint = `${endpointBase}/v2/translate`;
  const results: string[] = [];
  const chunkSize = 40;

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    const params = new URLSearchParams();
    chunk.forEach((entry) => params.append('text', entry.value));
    params.append('target_lang', targetLang.toUpperCase());
    if (sourceLang) {
      params.append('source_lang', sourceLang.toUpperCase());
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${settings.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepL translation failed (${response.status}): ${errorText}`);
    }

    const json = (await response.json()) as {
      translations: { text: string }[];
    };

    json.translations.forEach((translation) => results.push(translation.text));
    onChunkTranslated?.(chunk.length);
  }

  return results;
}

async function translateWithGoogle(
  entries: FlatStringEntry[],
  sourceLang: string,
  targetLang: string,
  settings: TranslationSettings,
  onChunkTranslated?: (chunkCount: number) => void
): Promise<string[]> {
  const endpointBase = (settings.apiUrl ?? 'https://translation.googleapis.com').replace(/\/$/, '');
  const endpoint = `${endpointBase}/language/translate/v2?key=${encodeURIComponent(settings.apiKey)}`;
  const results: string[] = [];
  const chunkSize = 100;
  const normalizedTarget = targetLang.split(/[-_]/)[0].toLowerCase();
  const normalizedSource = sourceLang ? sourceLang.split(/[-_]/)[0].toLowerCase() : '';

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    const body: Record<string, any> = {
      q: chunk.map((entry) => entry.value),
      target: normalizedTarget,
      format: 'text',
    };
    if (normalizedSource) {
      body.source = normalizedSource;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Translate failed (${response.status}): ${errorText}`);
    }

    const json = (await response.json()) as {
      data?: { translations: { translatedText: string }[] };
    };

    if (!json.data?.translations) {
      throw new Error('Google Translate response missing translations.');
    }

    json.data.translations.forEach((translation) => results.push(translation.translatedText));
    onChunkTranslated?.(chunk.length);
  }

  return results;
}

async function translateWithOpenAI(
  entries: FlatStringEntry[],
  sourceLang: string,
  targetLang: string,
  settings: TranslationSettings,
  localeTarget: LocaleTarget,
  onChunkTranslated?: (chunkCount: number) => void
): Promise<string[]> {
  const endpointBase = (settings.apiUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const endpoint = `${endpointBase}/chat/completions`;
  const model = settings.model?.trim() || 'gpt-4o-mini';
  const results: string[] = [];
  const chunkSize = 20;

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        temperature: undefined,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'translations',
            schema: {
              type: 'object',
              properties: {
                translations: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['translations'],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: 'system',
            content:
              'You are a translation engine that outputs valid JSON. Preserve placeholders (e.g., {name}, {{value}}, %s) verbatim.',
          },
          {
            role: 'user',
            content: `Translate the following ${chunk.length} UI strings from ${sourceLang} to ${targetLang}. Respond with JSON matching the schema.`,
          },
          {
            role: 'user',
            content: JSON.stringify(chunk.map((entry) => entry.value)),
          },
        ],
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(`OpenAI translation failed (${response.status}): ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let aggregatedContent = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') {
          continue;
        }
        if (!trimmed.startsWith('data:')) continue;

        const payload = trimmed.replace(/^data:\s*/, '');
        if (!payload) continue;
        try {
          const parsed = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          };
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            aggregatedContent += content;
          }
        } catch {
          // ignore malformed SSE chunk
        }
      }
    }

    if (!aggregatedContent.trim()) {
      throw new Error('OpenAI stream returned no content.');
    }

    let parsedJson: { translations?: string[] };
    try {
      parsedJson = JSON.parse(aggregatedContent);
    } catch (err) {
      throw new Error(`Unable to parse OpenAI response: ${(err as Error).message}`);
    }

    if (!Array.isArray(parsedJson.translations)) {
      throw new Error('OpenAI response missing "translations" array.');
    }

    results.push(...parsedJson.translations);
    onChunkTranslated?.(parsedJson.translations.length);
  }

  return results;
}

