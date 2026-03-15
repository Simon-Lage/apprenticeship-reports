import ReactDiffViewer from 'react-diff-viewer-continued';

type JsonDiffViewerProps = {
  currentValue: unknown;
  incomingValue: unknown;
  currentTitle: string;
  incomingTitle: string;
};

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function JsonDiffViewer({
  currentValue,
  incomingValue,
  currentTitle,
  incomingTitle,
}: JsonDiffViewerProps) {
  return (
    <div className="overflow-hidden rounded-md border border-primary-tint/80">
      <ReactDiffViewer
        oldValue={stringify(currentValue)}
        newValue={stringify(incomingValue)}
        splitView
        showDiffOnly={false}
        hideLineNumbers={false}
        leftTitle={currentTitle}
        rightTitle={incomingTitle}
        styles={{
          variables: {
            dark: {
              diffViewerBackground: 'var(--background)',
              diffViewerColor: 'var(--text-color)',
              addedBackground:
                'color-mix(in oklch, var(--primary-tint) 55%, #b5f5d0)',
              addedColor: 'var(--text-color)',
              removedBackground:
                'color-mix(in oklch, var(--primary-tint) 45%, #ffc9c9)',
              removedColor: 'var(--text-color)',
              wordAddedBackground:
                'color-mix(in oklch, var(--primary-tint) 30%, #7ce3a5)',
              wordRemovedBackground:
                'color-mix(in oklch, var(--primary-tint) 20%, #ff9f9f)',
              addedGutterBackground:
                'color-mix(in oklch, var(--primary-tint) 60%, #d7f9e6)',
              removedGutterBackground:
                'color-mix(in oklch, var(--primary-tint) 45%, #ffe4e4)',
              gutterBackground:
                'color-mix(in oklch, var(--primary-tint) 45%, white)',
              gutterBackgroundDark:
                'color-mix(in oklch, var(--primary-tint) 45%, white)',
              highlightBackground:
                'color-mix(in oklch, var(--primary-tint) 65%, white)',
              highlightGutterBackground:
                'color-mix(in oklch, var(--primary-tint) 55%, white)',
            },
            light: {
              diffViewerBackground: 'white',
              diffViewerColor: 'var(--text-color)',
              addedBackground:
                'color-mix(in oklch, var(--primary-tint) 55%, #b5f5d0)',
              addedColor: 'var(--text-color)',
              removedBackground:
                'color-mix(in oklch, var(--primary-tint) 45%, #ffc9c9)',
              removedColor: 'var(--text-color)',
              wordAddedBackground:
                'color-mix(in oklch, var(--primary-tint) 30%, #7ce3a5)',
              wordRemovedBackground:
                'color-mix(in oklch, var(--primary-tint) 20%, #ff9f9f)',
              addedGutterBackground:
                'color-mix(in oklch, var(--primary-tint) 60%, #d7f9e6)',
              removedGutterBackground:
                'color-mix(in oklch, var(--primary-tint) 45%, #ffe4e4)',
              gutterBackground:
                'color-mix(in oklch, var(--primary-tint) 45%, white)',
              gutterBackgroundDark:
                'color-mix(in oklch, var(--primary-tint) 45%, white)',
              highlightBackground:
                'color-mix(in oklch, var(--primary-tint) 65%, white)',
              highlightGutterBackground:
                'color-mix(in oklch, var(--primary-tint) 55%, white)',
            },
          },
          contentText: {
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: '12px',
          },
        }}
      />
    </div>
  );
}
