import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiZap, FiKey, FiSave, FiCheckSquare, FiSquare } from 'react-icons/fi';
import type { CandidateString } from './types';
import { suggestKey, nestKey, flattenLanguageKeys } from './utils/keygen';
import { TopBar } from './components/TopBar';
import { WorkspaceControls } from './components/WorkspaceControls';
import { CandidateTable } from './components/CandidateTable';
import { SummaryCards } from './components/SummaryCards';
import { LanguagePreview } from './components/LanguagePreview';

const ipc = window.api;

export default function App() {
  const [projectPath, setProjectPath] = useState('');
  const [languagePath, setLanguagePath] = useState('');
  const [languageData, setLanguageData] = useState<Record<string, any>>({});
  const [candidates, setCandidates] = useState<CandidateString[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');

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

  const handleChooseProject = async () => {
    const path = await ipc.openProject();
    if (path) setProjectPath(path);
  };

  const handleChooseLanguage = async () => {
    const path = await ipc.openLanguageFile();
    if (path) {
      setLanguagePath(path);
      await loadLanguage(path);
    }
  };

  const handleScan = async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      const { candidates } = await ipc.scanProject({
        rootPath: projectPath,
        extensions: ['.tsx', '.jsx', '.ts', '.js'],
        ignore: ['node_modules', 'dist', 'build'],
      });

      const withKeys = candidates.map((c) => ({
        ...c,
        keySuggestion: suggestKey(c.text, 'ui'),
        include: true,
      }));
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
      prev.map((c) => ({
        ...c,
        keySuggestion: suggestKey(c.text, 'ui'),
      }))
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <TopBar />
      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6">
        <WorkspaceControls
          projectPath={projectPath}
          languagePath={languagePath}
          onChooseProject={handleChooseProject}
          onChooseLanguage={handleChooseLanguage}
          onScan={handleScan}
          onSave={handleSave}
          disabled={loading}
        />

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
            className="grid gap-4 lg:grid-cols-3"
          >
            <div className="lg:col-span-2">
              <CandidateTable
                candidates={candidates}
                onUpdateKey={handleUpdateKey}
                onToggle={handleToggle}
                filter={filter}
                onFilterChange={setFilter}
              />
            </div>
            <div className="flex flex-col gap-3">
              <LanguagePreview
                path={languagePath}
                jsonPreview={preview}
                onReveal={() => languagePath && ipc.showItemInFolder(languagePath)}
              />
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
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
      </main>
    </div>
  );
}
