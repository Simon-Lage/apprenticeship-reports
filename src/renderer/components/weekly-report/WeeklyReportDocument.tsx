import { FiCopy } from 'react-icons/fi';

import { Button } from '@/components/ui/button';
import { WeeklyDocumentData } from '@/renderer/lib/weekly-report-document';

type WeeklyReportDocumentProps = {
  document: WeeklyDocumentData;
  className?: string;
  copyActionLabel?: string;
  onCopySection?: (sectionIndex: number) => void;
};

function resolveRootSpacing(density: WeeklyDocumentData['density']): string {
  if (density === 'dense') {
    return 'space-y-3 text-[10px] leading-[1.28]';
  }

  if (density === 'compact') {
    return 'space-y-4 text-[11px] leading-[1.35]';
  }

  return 'space-y-5 text-[12px] leading-[1.4]';
}

function resolveBoxHeight(density: WeeklyDocumentData['density']): string {
  if (density === 'dense') {
    return 'min-h-[48px]';
  }

  if (density === 'compact') {
    return 'min-h-[54px]';
  }

  return 'min-h-[60px]';
}

function resolveEntrySpacing(density: WeeklyDocumentData['density']): string {
  if (density === 'dense') {
    return 'space-y-1';
  }

  if (density === 'compact') {
    return 'space-y-1.5';
  }

  return 'space-y-2';
}

export default function WeeklyReportDocument({
  document,
  className = '',
  copyActionLabel,
  onCopySection,
}: WeeklyReportDocumentProps) {
  const boxHeight = resolveBoxHeight(document.density);

  return (
    <article
      className={`mx-auto w-full max-w-[210mm] bg-white px-8 py-9 text-text-color shadow-[0_24px_80px_rgba(15,23,42,0.12)] ${resolveRootSpacing(document.density)} ${className}`.trim()}
    >
      <header className="space-y-5">
        <h2 className="text-center text-[1.7em] font-semibold">
          {document.title}
        </h2>
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {document.summaryFields.map((field) => (
            <div
              key={field.label}
              className="flex items-baseline justify-between gap-2"
            >
              <span className="whitespace-nowrap font-semibold">
                {field.label}
              </span>
              <span className="min-w-0 text-right break-words">
                {field.value}
              </span>
            </div>
          ))}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {[document.rangeStartField, document.rangeEndField].map((field) => (
          <div key={field.label} className="space-y-1.5">
            <p className="font-semibold">{field.label}</p>
            <div
              className={`border border-primary-tint px-3 py-2 ${boxHeight}`}
            >
              <span className="self-center">{field.value}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-1.5">
        <p className="font-semibold">{document.areaField.label}</p>
        <div className={`border border-primary-tint px-3 py-2 ${boxHeight}`}>
          <span>{document.areaField.value}</span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {[document.supervisorField, document.supervisorRepeatField].map(
          (field) => (
            <div key={field.label} className="space-y-1.5">
              <p className="font-semibold">{field.label}</p>
              <div
                className={`border border-primary-tint px-3 py-2 ${boxHeight}`}
              >
                <span>{field.value}</span>
              </div>
            </div>
          ),
        )}
      </section>

      <section className="space-y-4">
        {document.sections.map((section, sectionIndex) => (
          <div key={section.title} className="group/section space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[1.08em] font-semibold">{section.title}</h3>
              {onCopySection && copyActionLabel ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-primary-tint"
                  onClick={() => onCopySection(sectionIndex)}
                >
                  <FiCopy className="h-4 w-4" />
                  {copyActionLabel}
                </Button>
              ) : null}
            </div>
            <div
              className={`border px-3 py-3 transition-colors ${
                onCopySection
                  ? 'border-transparent group-hover/section:border-primary-tint'
                  : 'border-transparent'
              }`}
            >
              {section.entries.length ? (
                <div className="space-y-3">
                  {section.entries.map((entry) => (
                    <div
                      key={entry.heading}
                      className={resolveEntrySpacing(document.density)}
                    >
                      <p className="font-semibold">{entry.heading}</p>
                      <ul className="list-disc space-y-1 pl-5">
                        {entry.items.map((item) => (
                          <li key={`${entry.heading}-${item}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p>{section.emptyValue}</p>
              )}
            </div>
          </div>
        ))}
      </section>
    </article>
  );
}
