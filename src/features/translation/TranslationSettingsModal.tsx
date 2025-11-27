import { LANGUAGE_CHOICES } from '../../constants/languages';
import type { TranslationSettings } from '../../types';
import { TRANSLATION_PROVIDER_CONFIGS } from './constants';
import { Modal } from '../../components/common/Modal';
import { FiX } from 'react-icons/fi';

type Props = {
  open: boolean;
  onClose: () => void;
  translationForm: TranslationSettings;
  translationSettings: TranslationSettings | null;
  languageDir: string;
  languagePath: string;
  translationSaving: boolean;
  translationSyncing: boolean;
  translationMessage: string;
  translationError: string;
  openAiModels: string[];
  openAiModelsLoading: boolean;
  openAiModelsError: string;
  newTargetLocale: string;
  onNewTargetLocaleChange: (value: string) => void;
  onProviderChange: (provider: TranslationSettings['provider']) => void;
  onFormChange: <K extends keyof TranslationSettings>(field: K, value: TranslationSettings[K]) => void;
  onAddTargetLocale: () => void;
  onRemoveTargetLocale: (locale: string) => void;
  onSaveSettings: () => void;
  onSyncTranslations: () => void;
};

export function TranslationSettingsModal({
  open,
  onClose,
  translationForm,
  translationSettings,
  languageDir,
  languagePath,
  translationSaving,
  translationSyncing,
  translationMessage,
  translationError,
  openAiModels,
  openAiModelsLoading,
  openAiModelsError,
  newTargetLocale,
  onNewTargetLocaleChange,
  onProviderChange,
  onFormChange,
  onAddTargetLocale,
  onRemoveTargetLocale,
  onSaveSettings,
  onSyncTranslations,
}: Props) {
  if (!open) return null;

  const currentProviderConfig = TRANSLATION_PROVIDER_CONFIGS[translationForm.provider];
  const targetLocales = translationForm.targetLocales ?? [];
  const canSync =
    Boolean(translationSettings?.apiKey && languageDir && languagePath) && !translationSyncing;

  return (
    <Modal title="Settings" onClose={onClose} className="max-w-2xl">
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <section className="rounded-2xl border border-slate-900/70 bg-slate-950/40 p-4">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-white">Auto-translation</h3>
            <p className="text-sm text-slate-400">Bring your own API key to enable automatic translations.</p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              Provider
              <select
                value={translationForm.provider}
                onChange={(e) => onProviderChange(e.target.value as TranslationSettings['provider'])}
                className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              >
                {Object.entries(TRANSLATION_PROVIDER_CONFIGS).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              API key
              <input
                type="password"
                value={translationForm.apiKey}
                onChange={(e) => onFormChange('apiKey', e.target.value)}
                placeholder="Enter your provider key"
                className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              {currentProviderConfig.endpointLabel}
              <input
                value={translationForm.apiUrl ?? ''}
                onChange={(e) => onFormChange('apiUrl', e.target.value)}
                placeholder={currentProviderConfig.endpointPlaceholder}
                className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              />
            </label>

            {currentProviderConfig.showModel && (
              <div className="flex flex-col gap-2 text-sm text-slate-300">
                <span>Model</span>
                {openAiModelsLoading && <p className="text-xs text-slate-400">Loading models…</p>}
                {openAiModelsError && <p className="text-xs text-rose-300">{openAiModelsError}</p>}
                {openAiModels.length > 0 ? (
                  <select
                    value={translationForm.model ?? ''}
                    onChange={(e) => onFormChange('model', e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  >
                    {openAiModels.map((modelId) => (
                      <option key={modelId} value={modelId}>
                        {modelId}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={translationForm.model ?? ''}
                    onChange={(e) => onFormChange('model', e.target.value)}
                    placeholder={TRANSLATION_PROVIDER_CONFIGS.openai.defaultModel}
                    className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Target locales</span>
              <p className="text-xs text-slate-500">
                Specify which locale files should be synced (e.g., <code>es</code>, <code>fr-CA</code>). Missing files will
                be created automatically.
              </p>
              <div className="flex flex-wrap gap-2">
                {targetLocales.length === 0 && (
                  <span className="rounded-full border border-dashed border-slate-800 px-3 py-1 text-xs text-slate-400">
                    No locales added yet
                  </span>
                )}
                {targetLocales.map((locale) => (
                  <span
                    key={locale}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100"
                  >
                    {locale}
                    <button
                      type="button"
                      onClick={() => onRemoveTargetLocale(locale)}
                      className="text-emerald-200 transition hover:text-emerald-50"
                      aria-label={`Remove ${locale}`}
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newTargetLocale}
                  onChange={(e) => onNewTargetLocaleChange(e.target.value)}
                  placeholder="Start typing a language code…"
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  list="locale-options"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddTargetLocale();
                    }
                  }}
                />
                <datalist id="locale-options">
                  {LANGUAGE_CHOICES.map((choice) => (
                    <option key={choice.code} value={choice.code}>
                      {choice.label}
                    </option>
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={onAddTargetLocale}
                  className="rounded-lg border border-slate-800 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-white transition hover:border-slate-700"
                >
                  Add
                </button>
              </div>
            </div>

            {translationMessage && <p className="text-xs text-emerald-300">{translationMessage}</p>}
            {translationError && <p className="text-xs text-rose-300">{translationError}</p>}

            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSaveSettings}
                className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-white transition hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={translationSaving}
              >
                {translationSaving ? 'Saving…' : 'Save settings'}
              </button>
              <button
                type="button"
                onClick={onSyncTranslations}
                disabled={!canSync}
                className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {translationSyncing ? 'Translating…' : 'Sync translations'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}

