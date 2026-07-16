import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import releaseNotes from '@/release-notes.json';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';

const seenVersionStorageKey = 'apprep.release-notes.seen-version';

export default function ReleaseNotesDialog() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const [version, setVersion] = useState<string | null>(null);
  const [previousVersion, setPreviousVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!runtime.api) {
      return;
    }

    let active = true;

    runtime.api
      .getAppBuildInfo()
      .then((buildInfo) => {
        if (!active) {
          return;
        }

        const seenVersion = localStorage.getItem(seenVersionStorageKey);

        if (!seenVersion) {
          localStorage.setItem(seenVersionStorageKey, buildInfo.version);
          return;
        }

        if (seenVersion !== buildInfo.version) {
          setPreviousVersion(seenVersion);
          setVersion(buildInfo.version);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [runtime.api]);

  const close = () => {
    if (version) {
      localStorage.setItem(seenVersionStorageKey, version);
    }
    setVersion(null);
    setPreviousVersion(null);
  };

  return (
    <Dialog open={Boolean(version)} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('releaseNotes.title', { version })}</DialogTitle>
          <DialogDescription>{t('releaseNotes.description')}</DialogDescription>
        </DialogHeader>
        {releaseNotes.changes.length ? (
          <ul className="list-disc space-y-2 pl-5 text-sm text-text-color/80">
            {releaseNotes.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-color/80">
            {t('releaseNotes.fallback', {
              previousVersion,
              version,
            })}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={close}
          >
            {t('common.understood')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
