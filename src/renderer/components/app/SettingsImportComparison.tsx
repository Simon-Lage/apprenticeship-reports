import { ReactNode } from 'react';

import JsonDiffViewer from '@/renderer/components/app/JsonDiffViewer';
import { useSettingsComparison } from '@/renderer/hooks/useSettingsComparison';
import { CompareLayout } from '@/renderer/layouts/CompareLayout';
import { formatGermanDateTime } from '@/renderer/lib/date-format';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { JsonObject } from '@/shared/common/json';
import { SettingsImportPreview } from '@/shared/settings/schema';

type DiffCountDisplay =
  | {
      type: 'text';
      label: string;
    }
  | {
      type: 'alert';
      title: string;
    };

type SettingsImportComparisonProps = {
  preview: SettingsImportPreview;
  currentTitleLabel: string;
  incomingTitleLabel: string;
  diffCountDisplay?: DiffCountDisplay;
  notice?: ReactNode;
  showDifferenceList?: boolean;
};

export default function SettingsImportComparison({
  preview,
  currentTitleLabel,
  incomingTitleLabel,
  diffCountDisplay,
  notice,
  showDifferenceList = false,
}: SettingsImportComparisonProps) {
  const settingsComparison = useSettingsComparison(
    preview.current.values as JsonObject,
    preview.incoming.values as JsonObject,
  );
  const currentTitle = `${currentTitleLabel} (${formatGermanDateTime(preview.current.capturedAt)})`;
  const incomingTitle = `${incomingTitleLabel} (${formatGermanDateTime(preview.incoming.capturedAt)})`;

  return (
    <div className="space-y-4">
      {diffCountDisplay?.type === 'text' ? (
        <p className="text-sm text-text-color/75">
          {diffCountDisplay.label}: {settingsComparison.differences.length}
        </p>
      ) : null}
      {diffCountDisplay?.type === 'alert' ? (
        <Alert className="border-primary-tint bg-primary-tint/30">
          <AlertTitle>{diffCountDisplay.title}</AlertTitle>
          <AlertDescription>
            {settingsComparison.differences.length}
          </AlertDescription>
        </Alert>
      ) : null}
      {notice}
      <CompareLayout
        leftTitle={currentTitle}
        rightTitle={incomingTitle}
        left={
          <pre className="whitespace-pre-wrap break-words p-5 text-xs text-text-color">
            {JSON.stringify(preview.current.values, null, 2)}
          </pre>
        }
        right={
          <pre className="whitespace-pre-wrap break-words p-5 text-xs text-text-color">
            {JSON.stringify(preview.incoming.values, null, 2)}
          </pre>
        }
      />
      <JsonDiffViewer
        currentValue={preview.current.values}
        incomingValue={preview.incoming.values}
        currentTitle={currentTitle}
        incomingTitle={incomingTitle}
      />
      {showDifferenceList && settingsComparison.differences.length ? (
        <ul className="max-h-56 space-y-2 overflow-auto pr-1 text-sm">
          {settingsComparison.differences.slice(0, 12).map((difference) => (
            <li
              key={`${difference.path}-${difference.kind}`}
              className="rounded-md border border-primary-tint/80 bg-primary-tint/20 px-3 py-2 text-text-color"
            >
              <strong>{difference.path}</strong> ({difference.kind})
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

SettingsImportComparison.defaultProps = {
  diffCountDisplay: undefined,
  notice: undefined,
  showDifferenceList: false,
};
