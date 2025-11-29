import { FiRefreshCcw, FiSave } from 'react-icons/fi';
import type { TranslationSyncResult } from '../../types';

type Props = {
  projectPath: string;
  workspaceSubtitle: string;
  scanIncludedDirs: string[];
  onOpenFolderModal: () => void;
  onScan: () => void;
  onSave: () => void;
  onSyncTranslations: () => void;
  onOpenSettings: () => void;
  canScan: boolean;
  canSave: boolean;
  canSync: boolean;
  translationSyncing: boolean;
  translationMessage: string;
  translationError: string;
  translationDetails: TranslationSyncResult['details'];
};

export function WorkspaceHeader({
  projectPath,
  workspaceSubtitle,
  scanIncludedDirs,
  onOpenFolderModal,
  onScan,
  onSave,
  onSyncTranslations,
  onOpenSettings,
  canScan,
  canSave,
  canSync,
  translationSyncing,
  translationMessage,
  translationError,
  translationDetails,
}: Props) {
  return (
    <header className="border-b border-slate-900/70 bg-slate-950/80 px-4 py-4 shadow-lg shadow-black/20 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Active project</p>
          <h2 className="text-2xl font-semibold text-white">{projectPath || 'No project selected yet'}</h2>
          <p className="text-sm text-slate-400">{workspaceSubtitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <button
              onClick={onOpenFolderModal}
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
            onClick={onScan}
            disabled={!canScan}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRefreshCcw className="h-4 w-4" />
            Run scan
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiSave className="h-4 w-4" />
            Save base file
          </button>
          <button
            onClick={onSyncTranslations}
            disabled={!canSync}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {translationSyncing ? 'Translating…' : 'Sync translations'}
          </button>
          <button
            onClick={onOpenSettings}
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
  );
}

