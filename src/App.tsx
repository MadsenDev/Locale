import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiZap, FiKey, FiSave, FiCheckSquare, FiSquare } from 'react-icons/fi';
import type { CandidateString } from './types';
import { suggestKey, nestKey, flattenLanguageKeys, namespaceFromFile } from './utils/keygen';
import { WorkspaceControls } from './components/WorkspaceControls';
import { SummaryCards } from './components/SummaryCards';
import { LanguagePreview } from './components/LanguagePreview';
import { Modal } from './components/common/Modal';
import { useFolderSelection } from './features/scanner/useFolderSelection';
import { FolderSelectorModal } from './features/scanner/FolderSelectorModal';
import { TranslationProgressModal } from './features/translation/TranslationProgressModal';
import { TranslationSettingsModal } from './features/translation/TranslationSettingsModal';
import { ROOT_NODE_KEY } from './features/scanner/constants';
import { LANGUAGE_CHOICES } from './constants/languages';
import { WorkspaceHeader } from './features/workspace/WorkspaceHeader';
import { CandidateViews, type CandidateViewMode } from './features/candidates/CandidateViews';
import { useTranslationManager } from './features/translation/useTranslationManager';
import { Titlebar } from './components/Titlebar';
import {
  TranslationReadyModal,
  type TranslationReadyConfig,
} from './features/codemods/TranslationReadyModal';

type LanguageFileInfo = {
  name: string;
  path: string;
};

type CodeModState = {
  open: boolean;
  candidate: CandidateString | null;
  key: string;
  submitting: boolean;
  error: string;
};

const DEFAULT_CODEMOD_CONFIG: TranslationReadyConfig = {
  functionName: 't',
  importSource: 'i18next',
  importKind: 'named',
  skipImport: false,
};

const I18N_PATTERN = /i18n/i;

function packageFromImportSource(specifier: string) {
  const trimmed = specifier.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('.') || trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('@/')) return null;
  return trimmed;
}

const ipc = window.api;

export default function App() {
  const [projectPath, setProjectPath] = useState('');
  const [languageDir, setLanguageDir] = useState('');
  const [languagePath, setLanguagePath] = useState('');
  const [languageData, setLanguageData] = useState<Record<string, any>>({});
  const [candidates, setCandidates] = useState<CandidateString[]>([]);
  const [filter, setFilter] = useState('');
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const [candidateView, setCandidateView] = useState<CandidateViewMode>('list');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');
  const [extensionInput, setExtensionInput] = useState('.tsx,.jsx,.ts,.js');
  const [ignoreInput, setIgnoreInput] = useState('node_modules,dist,build');
  const [languageFiles, setLanguageFiles] = useState<LanguageFileInfo[]>([]);
  const [languageSelectionOpen, setLanguageSelectionOpen] = useState(false);
  const [languageCreationOpen, setLanguageCreationOpen] = useState(false);
  const [pendingLanguagePath, setPendingLanguagePath] = useState('');
  const [newLanguageCode, setNewLanguageCode] = useState('en');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const {
    translationForm,
    translationSettings,
    translationSaving,
    translationSyncing,
    translationMessage,
    translationError,
    openAiModels,
    openAiModelsLoading,
    openAiModelsError,
    newTargetLocale,
    setNewTargetLocale,
    translationDetails,
    translationProgressMap,
    translationProgressOrder,
    translationProgressOpen,
    setTranslationProgressOpen,
    handleProviderChange,
    handleTranslationFormChange,
    handleAddTargetLocale,
    handleRemoveTargetLocale,
    handleSaveTranslationSettings,
    handleSyncTranslations,
    canSyncTranslations,
  } = useTranslationManager(languageDir, languagePath);

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

  const canApplyCodemod = Boolean(projectPath);

  const [launchContextApplied, setLaunchContextApplied] = useState(false);
  const [codeModConfig, setCodeModConfig] = useState<TranslationReadyConfig>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_CODEMOD_CONFIG;
    }
    try {
      const raw = window.localStorage.getItem('localeforge.codemod');
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_CODEMOD_CONFIG, ...parsed };
      }
    } catch {
      // ignore persistence errors
    }
    return DEFAULT_CODEMOD_CONFIG;
  });
  const [codeModState, setCodeModState] = useState<CodeModState>({
    open: false,
    candidate: null,
    key: '',
    submitting: false,
    error: '',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('localeforge.codemod', JSON.stringify(codeModConfig));
    } catch {
      // ignore persistence errors
    }
  }, [codeModConfig]);

  const dropdownLanguageValue = LANGUAGE_CHOICES.some((choice) => choice.code === newLanguageCode)
    ? newLanguageCode
    : '__custom';
  const isCustomLanguage = dropdownLanguageValue === '__custom';
  const loadLanguage = useCallback(async (path: string) => {
    try {
      const { data } = await ipc.loadLanguageFile(path);
      setLanguageData(data);
      setPreview(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
      setLanguageData({});
      setPreview('// Unable to load file. It will be created on save.');
    }
  }, []);

  const inspectLanguageDirectory = useCallback(async (directory: string) => {
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
  }, []);

  const bootstrapProject = useCallback(
    async (path: string, options?: { openFolderModal?: boolean }) => {
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
      if (options?.openFolderModal) {
        await openFolderModal(path);
      }
    },
    [inspectLanguageDirectory, openFolderModal]
  );

  const handleChooseProject = async () => {
    const path = await ipc.openProject();
    if (!path) return;
    await bootstrapProject(path, { openFolderModal: true });
  };

  const handleChooseLanguageDir = async () => {
    const directory = await ipc.openLanguageDirectory(languageDir || projectPath || undefined);
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

  const handleOpenCodemod = useCallback((candidate: CandidateString) => {
    const fallbackKey = candidate.keySuggestion ?? suggestKey(candidate.text, namespaceFromFile(candidate.file));
    setCodeModState({
      open: true,
      candidate,
      key: fallbackKey ?? '',
      submitting: false,
      error: '',
    });
  }, []);

  const handleCodemodKeyChange = useCallback((value: string) => {
    setCodeModState((prev) => ({
      ...prev,
      key: value,
    }));
  }, []);

  const handleCodemodConfigChange = useCallback((next: Partial<TranslationReadyConfig>) => {
    setCodeModConfig((prev) => ({
      ...prev,
      ...next,
    }));
  }, []);

  const handleCloseCodemod = useCallback(() => {
    setCodeModState({
      open: false,
      candidate: null,
      key: '',
      submitting: false,
      error: '',
    });
  }, []);

  const handleApplyCodeMod = useCallback(async () => {
    if (!projectPath) {
      setCodeModState((prev) => ({
        ...prev,
        error: 'Select a project before patching.',
      }));
      return;
    }
    if (!codeModState.candidate) return;
    const key = codeModState.key.trim();
    if (!key) {
      setCodeModState((prev) => ({
        ...prev,
        error: 'Translation key is required.',
      }));
      return;
    }
    if (!codeModConfig.functionName.trim()) {
      setCodeModState((prev) => ({
        ...prev,
        error: 'Function name is required.',
      }));
      return;
    }

    const importSource = codeModConfig.importSource.trim();
    const packageName =
      !codeModConfig.skipImport && importSource ? packageFromImportSource(importSource) : null;

    setCodeModState((prev) => ({
      ...prev,
      submitting: true,
      error: '',
    }));

    try {
      if (packageName && I18N_PATTERN.test(packageName) && ipc.checkDependency) {
        const { installed } = await ipc.checkDependency({ projectPath, packageName });
        if (!installed) {
          const install = window.confirm(
            `${packageName} is not installed in this project. Install it now?`
          );
          if (!install) {
            setCodeModState((prev) => ({
              ...prev,
              submitting: false,
              error: `${packageName} must be installed before patching.`,
            }));
            return;
          }
          try {
            await ipc.installDependency({ projectPath, packageName });
          } catch (installErr) {
            setCodeModState((prev) => ({
              ...prev,
              submitting: false,
              error:
                installErr instanceof Error ? installErr.message : String(installErr ?? 'Failed to install dependency'),
            }));
            return;
          }
        }
      }

      await ipc.applyTranslationPatch({
        projectPath,
        relativePath: codeModState.candidate.file,
        text: codeModState.candidate.text,
        line: codeModState.candidate.line,
        column: codeModState.candidate.column,
        key,
        functionName: codeModConfig.functionName.trim(),
        importSource: codeModConfig.skipImport ? undefined : importSource || undefined,
        importKind: codeModConfig.importKind,
        skipImport: codeModConfig.skipImport,
      });

      setCandidates((prev) =>
        prev.map((candidate) =>
          candidate.id === codeModState.candidate?.id
            ? { ...candidate, keySuggestion: key, localized: true, include: false }
            : candidate
        )
      );

      setCodeModState({
        open: false,
        candidate: null,
        key: '',
        submitting: false,
        error: '',
      });
    } catch (err) {
      setCodeModState((prev) => ({
        ...prev,
        submitting: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [projectPath, codeModState, codeModConfig]);

  useEffect(() => {
    if (launchContextApplied) return;
    let cancelled = false;

    const applyLaunchContext = async () => {
      if (!ipc.getLaunchContext) {
        setLaunchContextApplied(true);
        return;
      }
      try {
        const context = await ipc.getLaunchContext();
        if (cancelled) return;
        if (context?.projectPath) {
          await bootstrapProject(context.projectPath);
        }
      } catch (err) {
        console.error('Failed to apply launch context', err);
      } finally {
        if (!cancelled) {
          setLaunchContextApplied(true);
        }
      }
    };

    applyLaunchContext();

    return () => {
      cancelled = true;
    };
  }, [bootstrapProject, launchContextApplied]);

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

      const filtered = candidates.filter((c) => !c.localized);

      const withKeys = filtered.map((c) => {
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
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
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
        <WorkspaceHeader
          projectPath={projectPath}
          workspaceSubtitle={workspaceSubtitle}
          scanIncludedDirs={scanIncludedDirs}
          onOpenFolderModal={() => openFolderModal()}
          onScan={handleScan}
          onSave={handleSave}
          onSyncTranslations={handleSyncTranslations}
          onOpenSettings={() => setSettingsModalOpen(true)}
          canScan={canScan}
          canSave={canSave}
          canSync={canSyncTranslations}
          translationSyncing={translationSyncing}
          translationMessage={translationMessage}
          translationError={translationError}
          translationDetails={translationDetails}
        />

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
                  <CandidateViews
                    candidates={candidates}
                    viewMode={candidateView}
                    onViewModeChange={setCandidateView}
                    filter={filter}
                    onFilterChange={setFilter}
                    onUpdateKey={handleUpdateKey}
                    onToggle={handleToggle}
                    onMakeTranslateReady={handleOpenCodemod}
                    languageKeys={languageKeys}
                    showAll={showAllCandidates}
                    onToggleShowAll={setShowAllCandidates}
                    canApplyCodemod={canApplyCodemod}
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
      <TranslationSettingsModal
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
      <TranslationReadyModal
        open={codeModState.open}
        candidate={codeModState.candidate}
        keyValue={codeModState.key}
        config={codeModConfig}
        submitting={codeModState.submitting}
        error={codeModState.error}
        onClose={handleCloseCodemod}
        onKeyChange={handleCodemodKeyChange}
        onConfigChange={handleCodemodConfigChange}
        onSubmit={handleApplyCodeMod}
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
