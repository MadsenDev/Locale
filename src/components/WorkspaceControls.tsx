import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { FiFolder, FiFileText, FiRefreshCcw, FiDownload } from 'react-icons/fi';

interface Props {
  projectPath: string;
  languageDir: string;
  languagePath: string;
  extensionInput: string;
  ignoreInput: string;
  onChooseProject: () => void;
  onChooseLanguageDir: () => void;
  onChooseLanguage: () => void;
  onScan: () => void;
  onSave: () => void;
  onExtensionChange: (value: string) => void;
  onIgnoreChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function WorkspaceControls({
  projectPath,
  languageDir,
  languagePath,
  extensionInput,
  ignoreInput,
  onChooseProject,
  onChooseLanguageDir,
  onChooseLanguage,
  onScan,
  onSave,
  onExtensionChange,
  onIgnoreChange,
  disabled,
  className,
}: Props) {
  const containerClass = ['flex h-full flex-col gap-6', className].filter(Boolean).join(' ');

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={containerClass}>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
        <SidebarButton
          label="Project root"
          description={projectPath || 'Select a folder to scan'}
          icon={<FiFolder className="h-5 w-5" />}
            onClick={onChooseProject}
        />
        <SidebarButton
          label="Language workspace"
          description={languageDir || 'Choose where JSON files live'}
          icon={<FiFileText className="h-5 w-5" />}
          onClick={onChooseLanguageDir}
        />
        <SidebarButton
          label="Base language file"
          description={languagePath || 'Pick or create your base locale'}
          icon={<FiFileText className="h-5 w-5" />}
          disabled={!languageDir}
            onClick={onChooseLanguage}
        />
            </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Scan settings</p>
        <SidebarField
          label="Extensions"
                value={extensionInput}
          onChange={onExtensionChange}
                placeholder=".js,.jsx,.ts,.tsx"
          helper="Comma-separated file extensions to inspect."
        />
        <SidebarField
          label="Ignore patterns"
                value={ignoreInput}
          onChange={onIgnoreChange}
                placeholder="node_modules,dist,.git"
          helper="Directories or globs that should be skipped."
              />
        </div>

      <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={onScan}
            disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRefreshCcw className="h-4 w-4" />
          Run scan
          </button>
          <button
            onClick={onSave}
            disabled={!languagePath || disabled}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-800/60 px-4 py-3 text-sm font-semibold text-white transition hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiDownload className="h-4 w-4" />
          Save base file
          </button>
      </div>
    </motion.section>
  );
}

function SidebarButton({
  label,
  description,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-900/70 bg-slate-900/50 px-4 py-3 text-left transition hover:border-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="rounded-lg bg-slate-800/80 p-2 text-emerald-300">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold text-white">{description}</p>
      </div>
    </button>
  );
}

function SidebarField({
  label,
  value,
  onChange,
  placeholder,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <label className="flex flex-col gap-2 rounded-2xl border border-slate-900/60 bg-slate-900/40 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
      />
      {helper && <span className="text-xs text-slate-500">{helper}</span>}
    </label>
  );
}
