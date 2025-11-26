import { describe, expect, it, vi } from 'vitest';
import { flattenLanguageKeys, nestKey, namespaceFromFile, suggestKey } from './keygen';

describe('suggestKey', () => {
  it('creates a slugified key within namespace', () => {
    const result = suggestKey('Hello World!');
    expect(result).toBe('strings.hello_world');
  });

  it('falls back to timestamped key when slug is empty', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const result = suggestKey('!!!', 'ui');

    expect(result).toBe('ui.text_1704067200000');
    vi.useRealTimers();
  });

  it('limits slug to six words and appends a hash when text is longer', () => {
    const result = suggestKey(
      'Jump start your stack with curated dependencies scripts and sample code preferences you can still tweak anything',
      'ui'
    );
    expect(result).toMatch(/^ui\.jump_start_your_stack_with_curated_[a-z0-9]{4}$/);
  });
});

describe('namespaceFromFile', () => {
  it('derives a namespace from the containing filename', () => {
    const namespace = namespaceFromFile('components/forms/SignupForm.tsx');
    expect(namespace).toBe('signup_form');
  });

  it('falls back to provided default when nothing usable exists', () => {
    const namespace = namespaceFromFile('', 'ui');
    expect(namespace).toBe('ui');
  });
});

describe('nestKey', () => {
  it('nests values into target object based on dot notation', () => {
    const target: Record<string, any> = {};

    nestKey('errors.form.required', 'Required', target);

    expect(target).toEqual({
      errors: {
        form: {
          required: 'Required',
        },
      },
    });
  });

  it('overwrites existing values at the final key', () => {
    const target = {
      errors: {
        form: {
          required: 'Old message',
        },
      },
    };

    nestKey('errors.form.required', 'New message', target);

    expect(target.errors.form.required).toBe('New message');
  });
});

describe('flattenLanguageKeys', () => {
  it('returns a flat set of dot-notated keys', () => {
    const sample = {
      buttons: { save: 'Save', cancel: 'Cancel' },
      titles: { settings: 'Settings' },
    };

    const keys = flattenLanguageKeys(sample);

    expect(keys).toEqual(new Set(['buttons.save', 'buttons.cancel', 'titles.settings']));
  });
});
