import { useEffect, useState } from 'react';
import type {
  TranslationProgressEvent,
  TranslationSettings,
  TranslationSyncResult,
} from '../../types';
import { TRANSLATION_PROVIDER_CONFIGS } from './constants';
import { normalizeLocaleInput } from '../../utils/locale';

const ipc = window.api;

type ProviderConfig = (typeof TRANSLATION_PROVIDER_CONFIGS)[TranslationSettings['provider']];

const getProviderConfig = (provider: TranslationSettings['provider']): ProviderConfig =>
  TRANSLATION_PROVIDER_CONFIGS[provider];

type ProgressMap = Record<string, TranslationProgressEvent & { timestamp: number }>;

export function useTranslationManager(languageDir: string, languagePath: string) {
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
  const [openAiModels, setOpenAiModels] = useState<string[]>([]);
  const [openAiModelsLoading, setOpenAiModelsLoading] = useState(false);
  const [openAiModelsError, setOpenAiModelsError] = useState('');
  const [newTargetLocale, setNewTargetLocale] = useState('');
  const [translationDetails, setTranslationDetails] = useState<TranslationSyncResult['details']>([]);
  const [translationProgressMap, setTranslationProgressMap] = useState<ProgressMap>({});
  const [translationProgressOrder, setTranslationProgressOrder] = useState<string[]>([]);
  const [translationProgressOpen, setTranslationProgressOpen] = useState(false);

  const canSyncTranslations =
    Boolean(translationSettings?.apiKey && languageDir && languagePath) && !translationSyncing;

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

  const handleTranslationFormChange = <K extends keyof TranslationSettings>(
    field: K,
    value: TranslationSettings[K]
  ) => {
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

  return {
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
  };
}

