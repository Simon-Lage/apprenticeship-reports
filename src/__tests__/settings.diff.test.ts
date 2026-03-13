import {
  createSettingsImportPreview,
  createSettingsSnapshot,
} from '@/shared/settings/schema';

describe('settings diff', () => {
  it('creates a preview with nested differences', () => {
    const current = createSettingsSnapshot({
      id: 'current',
      schemaVersion: 1,
      capturedAt: '2026-03-13T10:00:00.000Z',
      values: {
        backup: {
          enabled: true,
          frequency: 'manual',
        },
      },
    });

    const incoming = createSettingsSnapshot({
      id: 'incoming',
      schemaVersion: 1,
      capturedAt: '2026-03-13T11:00:00.000Z',
      values: {
        backup: {
          enabled: false,
          frequency: 'auto',
        },
        compareMode: true,
      },
    });

    const preview = createSettingsImportPreview({
      id: 'preview',
      createdAt: '2026-03-13T11:00:00.000Z',
      current,
      incoming,
    });

    expect(preview.differences.map((difference) => difference.path)).toEqual(
      expect.arrayContaining([
        'backup.enabled',
        'backup.frequency',
        'compareMode',
      ]),
    );
  });
});
