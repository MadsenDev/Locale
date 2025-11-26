import { motion } from 'framer-motion';
import { FiFolder, FiFileText, FiRefreshCcw, FiDownload } from 'react-icons/fi';

interface Props {
  projectPath: string;
  languagePath: string;
  onChooseProject: () => void;
  onChooseLanguage: () => void;
  onScan: () => void;
  onSave: () => void;
  disabled?: boolean;
}

export function WorkspaceControls({
  projectPath,
  languagePath,
  onChooseProject,
  onChooseLanguage,
  onScan,
  onSave,
  disabled,
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3">
          <button
            onClick={onChooseProject}
            className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3 text-left transition hover:border-emerald-500/60"
          >
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <FiFolder className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-300">Project root</p>
              <p className="text-sm font-semibold text-white truncate max-w-xl">
                {projectPath || 'Select a folder to scan'}
              </p>
            </div>
          </button>

          <button
            onClick={onChooseLanguage}
            className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3 text-left transition hover:border-blue-500/60"
          >
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-300">
              <FiFileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-300">Base language file</p>
              <p className="text-sm font-semibold text-white truncate max-w-xl">
                {languagePath || 'Pick or create your base JSON (en.json)'}
              </p>
            </div>
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onScan}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRefreshCcw className="h-4 w-4" />
            Scan project
          </button>
          <button
            onClick={onSave}
            disabled={!languagePath || disabled}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-800/60 px-4 py-3 text-sm font-semibold text-white transition hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiDownload className="h-4 w-4" />
            Save JSON
          </button>
        </div>
      </div>
    </motion.section>
  );
}
