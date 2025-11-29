function resolveAssetBases() {
  if (!globalThis.__ENTRY_URL__) {
    throw new Error('LocaleForge plugin entry URL unavailable. Please reinstall the plugin.');
  }
  const base = new URL('.', globalThis.__ENTRY_URL__);
  return {
    assetBase: new URL('web/', base),
  };
}

function rewriteHtmlMarkup(markup, bridgeKey, assetBase) {
  let html = markup;
  if (!html.includes('<base')) {
    html = html.replace(
      '<head>',
      `<head><base href="${assetBase.toString()}"><script>window.api = window.parent["${bridgeKey}"];</script>`
    );
  } else {
    html = html.replace(
      '<head>',
      `<head><script>window.api = window.parent["${bridgeKey}"];</script>`
    );
  }

  html = html.replace(/(["'])\/assets\//g, (_match, quote) => `${quote}${assetBase.toString()}assets/`);
  return html;
}

async function loadLocaleHtml(context, bridgeKey, assetBase) {
  const pluginId = context?.env?.pluginId ?? globalThis.__PLUGIN_ID__;
  const readFile = context?.electron?.plugins?.readFile;
  if (!pluginId || typeof readFile !== 'function') {
    throw new Error('Plugin asset loader is unavailable in this build.');
  }
  const markup = await readFile(pluginId, 'web/index.html', 'utf-8');
  return rewriteHtmlMarkup(markup, bridgeKey, assetBase);
}

function ensureLocaleHost(context) {
  const electron = context?.electron;
  const api = electron?.localeForge;
  if (!api) {
    throw new Error('LocaleForge host API is unavailable in this build.');
  }
  return api;
}

function createLocaleBridge(api) {
  const host = api;
  const listeners = new Set();
  const unsubscribe =
    typeof host.onTranslationProgress === 'function'
      ? host.onTranslationProgress((payload) => {
          listeners.forEach((listener) => {
            try {
              listener(payload);
            } catch (error) {
              console.error('[LocaleForge plugin] Progress listener failed', error);
            }
          });
        })
      : () => {};

  const wrap = (fn, fallback) => {
    if (typeof fn !== 'function') {
      return fallback;
    }
    return (...args) => fn(...args);
  };

  return {
    openProject: wrap(host.openProject, () => Promise.resolve(null)),
    openLanguageDirectory: wrap(host.openLanguageDirectory, () => Promise.resolve(null)),
    listProjectFolders: wrap(host.listProjectFolders, () => Promise.resolve({ children: [] })),
    autoDetectLanguageDirectory: wrap(host.autoDetectLanguageDirectory, () => Promise.resolve(null)),
    listLanguageFiles: wrap(host.listLanguageFiles, () => Promise.resolve({ files: [] })),
    createLanguageFile: wrap(host.createLanguageFile, () => Promise.resolve({ path: '' })),
    openLanguageFile: wrap(host.openLanguageFile, () => Promise.resolve(null)),
    scanProject: wrap(host.scanProject, () => Promise.resolve({ candidates: [] })),
    loadLanguageFile: wrap(host.loadLanguageFile, () => Promise.resolve({ data: {} })),
    saveLanguageFile: wrap(host.saveLanguageFile, () => Promise.resolve({ success: false })),
    showItemInFolder: wrap(host.showItemInFolder, () => {}),
    getTranslationSettings: wrap(host.getTranslationSettings, () => Promise.resolve(null)),
    saveTranslationSettings: wrap(host.saveTranslationSettings, () => Promise.resolve(null)),
    runTranslationSync: wrap(host.runTranslationSync, () =>
      Promise.reject(new Error('Translation service unavailable'))
    ),
    listTranslationModels: wrap(host.listTranslationModels, () => Promise.resolve([])),
    onTranslationProgress(callback) {
      if (typeof callback !== 'function') {
        return () => undefined;
      }
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    dispose() {
      unsubscribe();
      listeners.clear();
    },
  };
}

export async function mount(container, context = {}) {
  const hostApi = ensureLocaleHost(context);
  const { assetBase } = resolveAssetBases(context);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
  iframe.style.border = '0';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.backgroundColor = '#0f172a';
  iframe.style.borderRadius = '16px';
  iframe.loading = 'lazy';

  container.innerHTML = '';
  container.style.backgroundColor = '#020617';
  container.style.padding = '0';
  container.appendChild(iframe);

  const bridgeKey = `__localeBridge_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
  const bridge = createLocaleBridge(hostApi);
  Reflect.set(window, bridgeKey, bridge);

  let destroyed = false;

  const teardown = () => {
    if (destroyed) return;
    destroyed = true;
    bridge.dispose?.();
    delete window[bridgeKey];
    if (iframe.parentElement === container) {
      container.removeChild(iframe);
    }
  };

  try {
    const html = await loadLocaleHtml(context, bridgeKey, assetBase);
    if (!destroyed) {
      iframe.srcdoc = html;
    }
  } catch (error) {
    console.error('[LocaleForge plugin] Failed to load UI', error);
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#0f172a;color:#f8fafc;font-family:Inter,system-ui,sans-serif;border-radius:16px;padding:24px;text-align:center;">
      <div>
        <p style="font-size:16px;font-weight:600;margin-bottom:8px;">Unable to load LocaleForge</p>
        <p style="font-size:13px;opacity:.8;">${error instanceof Error ? error.message : error}</p>
      </div>
    </div>`;
  }

  return () => {
    teardown();
  };
}

