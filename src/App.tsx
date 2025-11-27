import { useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiZap, FiKey, FiSave, FiCheckSquare, FiSquare, FiRefreshCcw } from 'react-icons/fi';
import type {
  CandidateString,
  TranslationProgressEvent,
  TranslationSettings,
  TranslationSyncResult,
} from './types';
import { suggestKey, nestKey, flattenLanguageKeys, namespaceFromFile } from './utils/keygen';
import { WorkspaceControls } from './components/WorkspaceControls';
import { CandidateTable } from './components/CandidateTable';
import { SummaryCards } from './components/SummaryCards';
import { LanguagePreview } from './components/LanguagePreview';
import { Modal } from './components/common/Modal';
import { useFolderSelection } from './features/scanner/useFolderSelection';
import { FolderSelectorModal } from './features/scanner/FolderSelectorModal';
import { TranslationProgressModal } from './features/translation/TranslationProgressModal';
import { TranslationSettingsModal } from './features/translation/TranslationSettingsModal';
import { TRANSLATION_PROVIDER_CONFIGS } from './features/translation/constants';
import { ROOT_NODE_KEY } from './features/scanner/constants';
import { LANGUAGE_CHOICES } from './constants/languages';

const LOCALE_ALIASES: Record<string, string> = {
  se: 'sv',
  'zh-hans': 'zh-cn',
  'zh-hant': 'zh-tw',
};

type LanguageFileInfo = {
  name: string;
  path: string;
};

type TranslationProviderConfig = {
  label: string;
  endpointLabel: string;
  endpointPlaceholder: string;
  showModel: boolean;
  defaultApiUrl?: string;
  defaultModel?: string;
};

function normalizeLocaleInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const normalized = trimmed.replace(/_/g, '-').toLowerCase();
  return LOCALE_ALIASES[normalized] ?? normalized;
}

const ipc = window.api;

const getProviderConfig = (provider: TranslationSettings['provider']): TranslationProviderConfig =>
  TRANSLATION_PROVIDER_CONFIGS[provider] as TranslationProviderConfig;

const TranslationSettingsModalComponent =
  TranslationSettingsModal as ComponentType<Record<string, any>>;

export default function App() {
  const [projectPath, setProjectPath] = useState('');
  const [languageDir, setLanguageDir] = useState('');
  const [languagePath, setLanguagePath] = useState('');
  const [languageData, setLanguageData] = useState<Record<string, any>>({});
  const [candidates, setCandidates] = useState<CandidateString[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');
  const [extensionInput, setExtensionInput] = useState('.tsx,.jsx,.ts,.js');
  const [ignoreInput, setIgnoreInput] = useState('node_modules,dist,build');
  const [languageFiles, setLanguageFiles] = useState<LanguageFileInfo[]>([]);
  const [languageSelectionOpen, setLanguageSelectionOpen] = useState(false);
  const [languageCreationOpen, setLanguageCreationOpen] = useState(false);
  const [pendingLanguagePath, setPendingLanguagePath] = useState('');
  const [newLanguageCode, setNewLanguageCode] = useState('en');
  const [translationForm, setTranslationForm] = useState<TranslationSettings>({
    provider: 'deepl',
    apiKey: '',
    apiUrl: getProviderConfig('deepl').defaultApiUrl,
    model: getProviderConfig('deepl').defaultModel,
    targetLocales: [],
  });
  const [translationSettings, setTranslationSettings] = useState<TranslationSettings | null>(null);
  const [translationSaving, setTranslationSaving] = useState(false);
  const [translationSyncing, setTranslationSyncing] = useState(false);
  const [translationMessage, setTranslationMessage] = useState('');
  const [translationError, setTranslationError] = useState('');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [openAiModels, setOpenAiModels] = useState<string[]>([]);
  const [openAiModelsLoading, setOpenAiModelsLoading] = useState(false);
  const [openAiModelsError, setOpenAiModelsError] = useState('');
  const [newTargetLocale, setNewTargetLocale] = useState('');
  const [translationDetails, setTranslationDetails] = useState<TranslationSyncResult['details']>([]);
  const [translationProgressMap, setTranslationProgressMap] = useState<
    Record<string, TranslationProgressEvent & { timestamp: number }>
  >({});
  const [translationProgressOrder, setTranslationProgressOrder] = useState<string[]>([]);
  const [translationProgressOpen, setTranslationProgressOpen] = useState(false);

  const {
    modalOpen: folderModalOpen,
    openModal: openFolderModal,
    closeModal: closeFolderModal,
    applySelection: applyFolderSelection,
    selection: folderSelection,
    selectNode: handleFolderSelect,
    selectRecommended,
    selectNone,
    selectAllLoaded,
    expanded: folderExpanded,
    toggleNode: handleFolderToggle,
    treeData: folderTreeData,
    includedDirs: scanIncludedDirs,
    loading: folderModalLoading,
    error: folderModalError,
  } = useFolderSelection(projectPath);

  const languageKeys = useMemo(() => flattenLanguageKeys(languageData), [languageData]);

  const stats = useMemo(() => {
    const selected = candidates.filter((c) => c.include !== false && c.keySuggestion);
    const selectedKeys = new Set(selected.map((c) => c.keySuggestion!));
    const existing = selected.filter((c) => c.keySuggestion && languageKeys.has(c.keySuggestion)).length;
    const newKeys = Math.max(0, selected.length - existing);
    const obsolete = selected.length === 0 ? 0 : [...languageKeys].filter((key) => !selectedKeys.has(key)).length;

    return {
      total: candidates.length,
      selected: selected.length,
      newKeys,
      existing,
      obsolete,
    };
  }, [candidates, languageKeys]);

  const dropdownLanguageValue = LANGUAGE_CHOICES.some((choice) => choice.code === newLanguageCode)
    ? newLanguageCode
    : '__custom';
  const isCustomLanguage = dropdownLanguageValue === '__custom';
  useEffect(() => {
    ipc.getTranslationSettings?.().then((settings) => {
      if (settings) {
        setTranslationSettings(settings);
        setTranslationForm({
          provider: settings.provider,
          apiKey: settings.apiKey,
          apiUrl: settings.apiUrl ?? getProviderConfig(settings.provider).defaultApiUrl,
          model: settings.model ?? getProviderConfig(settings.provider).defaultModel,
          targetLocales: (settings.targetLocales ?? [])
            .map(normalizeLocaleInput)
            .filter(Boolean),
        });
        setNewTargetLocale('');
      }
    });
  }, []);

  useEffect(() => {
    if (translationForm.provider !== 'openai') {
      setOpenAiModels([]);
      setOpenAiModelsError('');
      setOpenAiModelsLoading(false);
      return;
    }

    const key = translationForm.apiKey.trim();
    if (!key) {
      setOpenAiModels([]);
      setOpenAiModelsError('');
      setOpenAiModelsLoading(false);
      return;
    }

    let cancelled = false;
    setOpenAiModelsLoading(true);
    setOpenAiModelsError('');

    const listModels = ipc.listTranslationModels;
    if (!listModels) {
      setOpenAiModels([]);
      setOpenAiModelsLoading(false);
      setOpenAiModelsError('');
      return;
    }

    listModels({
      provider: 'openai',
      apiKey: key,
      apiUrl: translationForm.apiUrl?.trim() || undefined,
    })
      .then((models) => {
        if (cancelled) return;
        setOpenAiModels(models);
        if (models.length && !translationForm.model) {
          setTranslationForm((prev) => ({
            ...prev,
            model: models[0],
          }));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setOpenAiModelsError(err instanceof Error ? err.message : String(err));
        setOpenAiModels([]);
      })
      .finally(() => {
        if (!cancelled) {
          setOpenAiModelsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [translationForm.provider, translationForm.apiKey, translationForm.apiUrl, translationForm.model, ipc.listTranslationModels]);

  useEffect(() => {
    const unsubscribe = ipc.onTranslationProgress?.((payload) => {
      if (payload.locale === '__complete__') {
        setTimeout(() => setTranslationProgressOpen(false), 800);
        return;
      }
      const timestamped = { ...payload, timestamp: Date.now() };
      setTranslationProgressMap((prev) => ({
        ...prev,
        [payload.locale]: timestamped,
      }));
      setTranslationProgressOrder((prev) =>
        prev.includes(payload.locale) ? prev : [...prev, payload.locale]
      );
    });
    return () => {
      unsubscribe?.();
    };
  }, [ipc]);

  const loadLanguage = async (path: string) => {
    try {
      const { data } = await ipc.loadLanguageFile(path);
      setLanguageData(data);
      setPreview(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
      setLanguageData({});
      setPreview('// Unable to load file. It will be created on save.');
    }
  };

  const inspectLanguageDirectory = async (directory: string) => {
    try {
      const { files } = await ipc.listLanguageFiles({ directory });
      setLanguageFiles(files);
      if (files.length > 0) {
        setPendingLanguagePath(files[0].path);
        setLanguageCreationOpen(false);
        setLanguageSelectionOpen(true);
      } else {
        setPendingLanguagePath('');
        setLanguageSelectionOpen(false);
        setLanguageCreationOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChooseProject = async () => {
    const path = await ipc.openProject();
    if (!path) return;
    setProjectPath(path);
    try {
      const detected = await ipc.autoDetectLanguageDirectory?.({ projectPath: path });
      if (detected) {
        setLanguageDir(detected);
        setLanguagePath('');
        setLanguageData({});
        setPreview('');
        setNewLanguageCode('en');
        await inspectLanguageDirectory(detected);
      }
    } catch (err) {
      console.warn('Failed to auto-detect language directory', err);
    }
    await openFolderModal(path);
  };

  const handleChooseLanguageDir = async () => {
    const directory = await ipc.openLanguageDirectory();
    if (!directory) return;
    setLanguageDir(directory);
    setLanguagePath('');
    setLanguageData({});
    setPreview('');
    setNewLanguageCode('en');
    await inspectLanguageDirectory(directory);
  };

  const handleChooseLanguage = async () => {
    if (!languageDir) {
      await handleChooseLanguageDir();
      return;
    }
    await inspectLanguageDirectory(languageDir);
  };

  const handleConfirmLanguageSelection = async () => {
    if (!pendingLanguagePath) return;
    setLanguagePath(pendingLanguagePath);
    setLanguageSelectionOpen(false);
    await loadLanguage(pendingLanguagePath);
  };

  const handleCreateBaseLanguage = async () => {
    if (!languageDir) return;
    try {
      const code = newLanguageCode.trim() || 'base';
      const { path } = await ipc.createLanguageFile({
        directory: languageDir,
        code,
      });
      setLanguagePath(path);
      setLanguageCreationOpen(false);
      await loadLanguage(path);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProviderChange = (value: TranslationSettings['provider']) => {
    const defaults = getProviderConfig(value);
    setTranslationForm((prev) => ({
      provider: value,
      apiKey: prev.apiKey,
      apiUrl: defaults.defaultApiUrl ?? '',
      model: value === 'openai' ? prev.model || defaults.defaultModel || '' : defaults.defaultModel || '',
      targetLocales: prev.targetLocales ?? [],
      region: undefined,
    }));
  };

  const handleTranslationFormChange = <K extends keyof TranslationSettings>(field: K, value: TranslationSettings[K]) => {
    setTranslationForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddTargetLocale = () => {
    const normalized = normalizeLocaleInput(newTargetLocale);
    if (!normalized) return;
    setTranslationForm((prev) => {
      const current = prev.targetLocales ?? [];
      if (current.includes(normalized)) return prev;
      return {
        ...prev,
        targetLocales: [...current, normalized],
      };
    });
    setNewTargetLocale('');
  };

  const handleRemoveTargetLocale = (locale: string) => {
    setTranslationForm((prev) => ({
      ...prev,
      targetLocales: (prev.targetLocales ?? []).filter((entry) => entry !== locale),
    }));
  };

  const handleSaveTranslationSettings = async () => {
    if (!ipc.saveTranslationSettings) return;
    setTranslationSaving(true);
    setTranslationError('');
    try {
      const payload =
        translationForm.apiKey.trim().length === 0
          ? null
          : {
              provider: translationForm.provider,
              apiKey: translationForm.apiKey.trim(),
              apiUrl: translationForm.apiUrl?.trim() || undefined,
              model: translationForm.model?.trim() || undefined,
              targetLocales: (translationForm.targetLocales ?? [])
                .map((locale) => normalizeLocaleInput(locale))
                .filter(Boolean),
            };
      const saved = await ipc.saveTranslationSettings(payload);
      setTranslationSettings(saved ?? null);
      setTranslationMessage(saved ? 'Translation settings saved.' : 'Translation disabled.');
    } catch (err) {
      setTranslationError(err instanceof Error ? err.message : String(err));
    } finally {
      setTranslationSaving(false);
    }
  };

  const handleSyncTranslations = async () => {
    if (!ipc.runTranslationSync) return;
    if (!languageDir || !languagePath) {
      setTranslationError('Select both a language workspace and a base file before syncing.');
      return;
    }
  setTranslationProgressMap({});
  setTranslationProgressOrder([]);
  setTranslationProgressOpen(true);
    setTranslationSyncing(true);
    setTranslationError('');
    setTranslationMessage('');
    setTranslationDetails([]);
    try {
      const result = await ipc.runTranslationSync({
        basePath: languagePath,
        languageDir,
      });
      const failed = result.details?.filter((detail) => detail.status === 'error').length ?? 0;
      setTranslationMessage(
        `Updated ${result.updatedFiles} locales (${result.translatedKeys} keys). ${result.skippedFiles} up to date${
          failed ? `, ${failed} failed` : ''
        }.`
      );
      setTranslationDetails(result.details ?? []);
    } catch (err) {
      setTranslationError(err instanceof Error ? err.message : String(err));
    } finally {
      setTranslationSyncing(false);
    }
  };

  const handleLanguageDropdownChange = (value: string) => {
    if (value === '__custom') {
      setNewLanguageCode('');
    } else {
      setNewLanguageCode(value);
    }
  };

  const handleScan = async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      const extensions = extensionInput
        .split(',')
        .map((ext) => ext.trim())
        .filter(Boolean)
        .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`));
      const ignore = ignoreInput
        .split(',')
        .map((pattern) => pattern.trim())
        .filter(Boolean);

      const { candidates } = await ipc.scanProject({
        rootPath: projectPath,
        extensions,
        ignore,
        directories: scanIncludedDirs.length > 0 ? scanIncludedDirs : undefined,
      });

      const withKeys = candidates.map((c) => {
        const namespace = namespaceFromFile(c.file, 'ui');
        return {
          ...c,
          keySuggestion: suggestKey(c.text, namespace),
          include: true,
        };
      });
      setCandidates(withKeys);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateKey = (id: string, key: string) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, keySuggestion: key } : c)));
  };

  const handleToggle = (id: string, include: boolean) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, include } : c)));
  };

  const regenerateKeys = () => {
    setCandidates((prev) =>
      prev.map((c) => {
        const namespace = namespaceFromFile(c.file, 'ui');
        return {
          ...c,
          keySuggestion: suggestKey(c.text, namespace),
        };
      })
    );
  };

  const selectAll = () => {
    setCandidates((prev) => prev.map((c) => ({ ...c, include: true })));
  };

  const deselectAll = () => {
    setCandidates((prev) => prev.map((c) => ({ ...c, include: false })));
  };

  const applyToBase = () => {
    const updated = { ...languageData };
    candidates
      .filter((c) => c.include !== false && c.keySuggestion)
      .forEach((c) => nestKey(c.keySuggestion!, c.text, updated));
    setLanguageData(updated);
    setPreview(JSON.stringify(updated, null, 2));
  };

  const handleSave = async () => {
    if (!languagePath) return;
    await ipc.saveLanguageFile({ path: languagePath, data: languageData });
  };

  const canScan = Boolean(projectPath) && !loading;
  const canSave = Boolean(languagePath) && !loading;
  const workspaceSubtitle = languagePath ? `Base file: ${languagePath}` : 'Select your base language file';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <aside className="hidden w-80 flex-shrink-0 flex-col border-r border-slate-900/80 bg-slate-950/90 px-5 py-6 lg:flex">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">LocaleForge</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Workspace</h1>
          <p className="text-sm text-slate-400">Configure what to scan and where translations live.</p>
        </div>
        <WorkspaceControls
          projectPath={projectPath}
          languageDir={languageDir}
          languagePath={languagePath}
          extensionInput={extensionInput}
          ignoreInput={ignoreInput}
          onChooseProject={handleChooseProject}
          onChooseLanguageDir={handleChooseLanguageDir}
          onChooseLanguage={handleChooseLanguage}
          onScan={handleScan}
          onSave={handleSave}
          onExtensionChange={setExtensionInput}
          onIgnoreChange={setIgnoreInput}
          disabled={loading}
          className="flex-1 overflow-y-auto pr-1"
        />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-slate-900/70 bg-slate-950/80 px-4 py-4 shadow-lg shadow-black/20 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Active project</p>
              <h2 className="text-2xl font-semibold text-white">{projectPath || 'No project selected yet'}</h2>
              <p className="text-sm text-slate-400">{workspaceSubtitle}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <button
                  onClick={() => openFolderModal()}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-1 text-xs font-semibold text-white transition hover:border-slate-700"
                >
                  Choose folders to scan
                </button>
                <span>
                  {scanIncludedDirs.length > 0
                    ? `${scanIncludedDirs.length} folder${scanIncludedDirs.length === 1 ? '' : 's'} selected`
                    : 'Scanning entire project'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleScan}
                disabled={!canScan}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiRefreshCcw className="h-4 w-4" />
                Run scan
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiSave className="h-4 w-4" />
                Save base file
              </button>
              <button
                onClick={handleSyncTranslations}
                disabled={
                  translationSyncing ||
                  !translationSettings ||
                  !translationSettings.apiKey ||
                  !languageDir ||
                  !languagePath
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {translationSyncing ? 'Translating…' : 'Sync translations'}
              </button>
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-700"
              >
                Settings
              </button>
            </div>
          </div>
          {(translationMessage || translationError) && (
            <div className="mt-3 space-y-1">
              {translationMessage && <p className="text-xs text-emerald-300">{translationMessage}</p>}
              {translationError && <p className="text-xs text-rose-300">{translationError}</p>}
              {translationDetails.length > 0 && (
                <div className="max-h-32 overflow-auto rounded-xl border border-slate-900/60 bg-slate-900/40">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="px-3 py-2 font-medium">Locale</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium text-right">Translated keys</th>
                      </tr>
                    </thead>
                    <tbody>
                      {translationDetails.map((detail) => (
                        <tr key={`${detail.locale}-${detail.path}`} className="border-t border-slate-900/50">
                          <td className="px-3 py-1.5 font-semibold text-white">{detail.locale || detail.path}</td>
                          <td className="px-3 py-1.5">
                            {detail.status === 'updated' && <span className="text-emerald-300">Updated</span>}
                            {detail.status === 'skipped' && <span className="text-slate-400">Up to date</span>}
                            {detail.status === 'error' && (
                              <span className="text-rose-300" title={detail.error}>
                                Error
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-right text-white">{detail.translated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </header>

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden px-4 py-4 md:px-6">
            <div className="lg:hidden">
              <WorkspaceControls
                projectPath={projectPath}
                languageDir={languageDir}
                languagePath={languagePath}
                extensionInput={extensionInput}
                ignoreInput={ignoreInput}
                onChooseProject={handleChooseProject}
                onChooseLanguageDir={handleChooseLanguageDir}
                onChooseLanguage={handleChooseLanguage}
                onScan={handleScan}
                onSave={handleSave}
                onExtensionChange={setExtensionInput}
                onIgnoreChange={setIgnoreInput}
                disabled={loading}
                className="rounded-2xl border border-slate-900/70 bg-slate-900/60 p-4"
              />
            </div>

            <SummaryCards
              total={stats.total}
              selected={stats.selected}
              newKeys={stats.newKeys}
              existing={stats.existing}
              obsolete={stats.obsolete}
            />

            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden lg:flex-row"
              >
                <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-900/70 bg-slate-900/40 p-4">
                  <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Candidates</p>
                      <h3 className="text-lg font-semibold text-white">Detected strings</h3>
                    </div>
                    <p className="text-sm text-slate-400">
                      {candidates.length ? `${candidates.length} strings found` : 'Run a scan to populate'}
                    </p>
                  </header>
                  <CandidateTable
                    candidates={candidates}
                    onUpdateKey={handleUpdateKey}
                    onToggle={handleToggle}
                    filter={filter}
                    onFilterChange={setFilter}
                    className="flex-1"
                  />
                </div>

                <div className="flex w-full flex-col gap-4 overflow-hidden lg:max-w-sm">
                  <LanguagePreview
                    path={languagePath}
                    jsonPreview={preview}
                    onReveal={() => languagePath && ipc.showItemInFolder(languagePath)}
                    className="flex flex-1 min-h-[260px] flex-col"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-slate-900/70 bg-slate-900/50 p-4"
                  >
                    <p className="mb-3 text-sm font-semibold text-white">Bulk actions</p>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={selectAll}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-white transition hover:border-slate-700"
                        >
                          <FiCheckSquare className="h-4 w-4" />
                          Select all
                        </button>
                        <button
                          onClick={deselectAll}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-white transition hover:border-slate-700"
                        >
                          <FiSquare className="h-4 w-4" />
                          Deselect all
                        </button>
                      </div>
                      <button
                        onClick={regenerateKeys}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-white transition hover:border-slate-700"
                      >
                        <FiKey className="h-4 w-4" />
                        Regenerate keys
                      </button>
                      <button
                        onClick={applyToBase}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400"
                      >
                        <FiZap className="h-4 w-4" />
                        Apply selected to base
                      </button>
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-white transition hover:border-slate-700"
                      >
                        <FiSave className="h-4 w-4" />
                        Save language file
                      </button>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      {languageSelectionOpen && (
        <Modal title="Choose your base language" onClose={() => setLanguageSelectionOpen(false)}>
          <p className="text-sm text-slate-300">
            We found the following JSON files inside <span className="font-semibold text-white">{languageDir}</span>.
            Pick which one should be treated as the base language.
          </p>
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {languageFiles.map((file) => (
              <label
                key={file.path}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
              >
                <input
                  type="radio"
                  className="h-4 w-4 accent-emerald-500"
                  checked={pendingLanguagePath === file.path}
                  onChange={() => setPendingLanguagePath(file.path)}
                />
                <span className="text-sm font-semibold text-white">{file.name}</span>
              </label>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setLanguageSelectionOpen(false)}
              className="rounded-lg border border-slate-800 bg-slate-800/60 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmLanguageSelection}
              disabled={!pendingLanguagePath}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Use file
            </button>
          </div>
        </Modal>
      )}
      {languageCreationOpen && (
        <Modal title="Create a base language" onClose={() => setLanguageCreationOpen(false)}>
          <p className="text-sm text-slate-300">
            No language files were found in <span className="font-semibold text-white">{languageDir}</span>. Choose which
            language should become the base and we will scaffold the JSON file for you.
          </p>
          <div className="mt-4 space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Language</span>
              <select
                value={dropdownLanguageValue}
                onChange={(e) => handleLanguageDropdownChange(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              >
                {LANGUAGE_CHOICES.map((choice) => (
                  <option key={choice.code} value={choice.code}>
                    {choice.label}
                  </option>
                ))}
                <option value="__custom">Custom code…</option>
              </select>
            </label>
            {isCustomLanguage && (
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Custom locale code</span>
                <input
                  value={newLanguageCode}
                  onChange={(e) => setNewLanguageCode(e.target.value)}
                  placeholder="e.g. en-US"
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
              </label>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setLanguageCreationOpen(false)}
              className="rounded-lg border border-slate-800 bg-slate-800/60 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBaseLanguage}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              Create file
            </button>
          </div>
        </Modal>
      )}
      <TranslationSettingsModalComponent
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        translationForm={translationForm}
        translationSettings={translationSettings}
        languageDir={languageDir}
        languagePath={languagePath}
        translationSaving={translationSaving}
        translationSyncing={translationSyncing}
        translationMessage={translationMessage}
        translationError={translationError}
        openAiModels={openAiModels}
        openAiModelsLoading={openAiModelsLoading}
        openAiModelsError={openAiModelsError}
        newTargetLocale={newTargetLocale}
        onNewTargetLocaleChange={setNewTargetLocale}
        onProviderChange={handleProviderChange}
        onFormChange={handleTranslationFormChange}
        onAddTargetLocale={handleAddTargetLocale}
        onRemoveTargetLocale={handleRemoveTargetLocale}
        onSaveSettings={handleSaveTranslationSettings}
        onSyncTranslations={handleSyncTranslations}
      />
      <TranslationProgressModal
        open={translationProgressOpen}
        onClose={() => setTranslationProgressOpen(false)}
        order={translationProgressOrder}
        logs={translationProgressMap}
      />
      <FolderSelectorModal
        open={folderModalOpen}
        loading={folderModalLoading}
        error={folderModalError}
        rootNodes={folderTreeData[ROOT_NODE_KEY] ?? []}
        treeData={folderTreeData}
        expanded={folderExpanded}
        selection={folderSelection}
        onClose={closeFolderModal}
        onApply={applyFolderSelection}
        onToggle={handleFolderToggle}
        onSelect={handleFolderSelect}
        onSelectRecommended={selectRecommended}
        onSelectNone={selectNone}
        onSelectAllLoaded={selectAllLoaded}
      />
    </div>
  );
}
