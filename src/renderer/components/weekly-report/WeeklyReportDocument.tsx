import { MouseEvent, useCallback, useMemo } from 'react';
import { FiCopy } from 'react-icons/fi';

import { Button } from '@/components/ui/button';
import {
  WeeklyDocumentData,
  WeeklyDocumentSection,
  WeeklyDocumentSectionEntry,
} from '@/renderer/lib/weekly-report-document';
import { cn } from '@/renderer/lib/utils';

export type WeeklyReportCopyField =
  | 'rangeStart'
  | 'rangeEnd'
  | 'area'
  | 'supervisor'
  | 'supervisorRepeat';

type WeeklyReportDocumentProps = {
  document: WeeklyDocumentData;
  className?: string;
  copyActionLabel?: string;
  onCopyField?: (field: WeeklyReportCopyField, value: string) => void;
  onCopySection?: (sectionIndex: number) => void;
};

type PaginatedSection = WeeklyDocumentSection & {
  sourceIndex: number;
};

type PaginatedPage = {
  sections: PaginatedSection[];
};

function resolvePageTextClassName(
  density: WeeklyDocumentData['density'],
): string {
  if (density === 'dense') {
    return 'text-[10.5px] leading-[1.28]';
  }

  if (density === 'compact') {
    return 'text-[11.5px] leading-[1.34]';
  }

  return 'text-[12.5px] leading-[1.4]';
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

function resolveContentCapacity(
  density: WeeklyDocumentData['density'],
): number {
  if (density === 'dense') return 54;
  if (density === 'compact') return 46;
  return 38;
}

function estimateTextUnits(value: string): number {
  return Math.max(1, Math.ceil(value.length / 92));
}

function estimateEntryUnits(entry: WeeklyDocumentSectionEntry): number {
  return (
    2 +
    estimateTextUnits(entry.heading) +
    entry.items.reduce((sum, item) => sum + estimateTextUnits(item), 0)
  );
}

function estimateSectionHeaderUnits(section: WeeklyDocumentSection): number {
  return section.entries.length ? 3 : 5;
}

function paginateDocument(document: WeeklyDocumentData): PaginatedPage[] {
  const capacity = resolveContentCapacity(document.density);
  const pages: PaginatedPage[] = [{ sections: [] }];
  let usedUnits = 0;

  const ensurePage = () => {
    if (!pages.length) {
      pages.push({ sections: [] });
    }
  };

  const startNewPage = () => {
    pages.push({ sections: [] });
    usedUnits = 0;
  };

  document.sections.forEach((section, sourceIndex) => {
    const sectionHeaderUnits = estimateSectionHeaderUnits(section);

    if (!section.entries.length) {
      if (usedUnits + sectionHeaderUnits > capacity && usedUnits > 0) {
        startNewPage();
      }

      ensurePage();
      pages[pages.length - 1].sections.push({ ...section, sourceIndex });
      usedUnits += sectionHeaderUnits;
      return;
    }

    let currentEntries: WeeklyDocumentSectionEntry[] = [];
    let currentSectionStarted = false;

    section.entries.forEach((entry) => {
      const entryUnits = estimateEntryUnits(entry);
      const requiredUnits =
        entryUnits + (currentSectionStarted ? 0 : sectionHeaderUnits);

      if (usedUnits + requiredUnits > capacity && usedUnits > 0) {
        if (currentEntries.length) {
          pages[pages.length - 1].sections.push({
            ...section,
            sourceIndex,
            entries: currentEntries,
          });
        }
        startNewPage();
        currentEntries = [];
        currentSectionStarted = false;
      }

      if (!currentSectionStarted) {
        usedUnits += sectionHeaderUnits;
        currentSectionStarted = true;
      }

      currentEntries.push(entry);
      usedUnits += entryUnits;
    });

    if (currentEntries.length) {
      pages[pages.length - 1].sections.push({
        ...section,
        sourceIndex,
        entries: currentEntries,
      });
    }
  });

  return pages.filter((page) => page.sections.length > 0);
}

function resolvePageKey(page: PaginatedPage): string {
  return page.sections
    .map((section) => {
      const firstEntry = section.entries[0];
      const lastEntry = section.entries[section.entries.length - 1];

      return [
        section.sourceIndex,
        section.title,
        firstEntry?.heading ?? 'empty',
        lastEntry?.heading ?? 'empty',
      ].join(':');
    })
    .join('|');
}

function resolvePageSectionKey(section: PaginatedSection): string {
  const firstEntry = section.entries[0];
  const lastEntry = section.entries[section.entries.length - 1];

  return [
    section.sourceIndex,
    section.title,
    firstEntry?.heading ?? 'empty',
    lastEntry?.heading ?? 'empty',
  ].join(':');
}

export default function WeeklyReportDocument({
  document,
  className = '',
  copyActionLabel,
  onCopyField,
  onCopySection,
}: WeeklyReportDocumentProps) {
  const pages = useMemo(() => paginateDocument(document), [document]);
  const handleCopyFieldClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (!onCopyField) {
        return;
      }

      const { copyField, copyValue } = event.currentTarget.dataset;

      if (!copyField || typeof copyValue !== 'string') {
        return;
      }

      onCopyField(copyField as WeeklyReportCopyField, copyValue);
    },
    [onCopyField],
  );
  const handleCopySectionClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (!onCopySection) {
        return;
      }

      const index = Number(event.currentTarget.dataset.sectionIndex);

      if (Number.isInteger(index)) {
        onCopySection(index);
      }
    },
    [onCopySection],
  );

  const renderDetailField = (
    field: {
      label: string;
      value: string;
    },
    copyField?: WeeklyReportCopyField,
  ) => (
    <div key={field.label} className="flex items-start gap-2">
      <span className="shrink-0 font-semibold">{field.label}</span>
      <span className="min-w-0 flex-1 break-words">{field.value}</span>
      {onCopyField && copyActionLabel && copyField ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-text-color/60 hover:bg-primary-tint/30 hover:text-text-color"
          aria-label={`${copyActionLabel}: ${field.label}`}
          data-copy-field={copyField}
          data-copy-value={field.value}
          onClick={handleCopyFieldClick}
        >
          <FiCopy className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );

  return (
    <article
      className={cn(
        'mx-auto flex w-full max-w-[210mm] flex-col gap-6',
        className,
      )}
    >
      {pages.map((page, pageIndex) => (
        <section
          key={resolvePageKey(page)}
          className={cn(
            'weekly-report-pdf-page mx-auto flex h-[297mm] w-[210mm] flex-col bg-white px-[18mm] py-[14mm] text-text-color shadow-[0_24px_80px_rgba(15,23,42,0.12)]',
            resolvePageTextClassName(document.density),
          )}
        >
          <header className="relative shrink-0 space-y-5 border-b border-primary-tint/70 pb-5">
            {document.companyLogoDataUrl ? (
              <img
                src={document.companyLogoDataUrl}
                alt=""
                className="absolute right-0 top-0 max-h-[18mm] max-w-[30mm] object-contain"
              />
            ) : null}
            <h2 className="px-[34mm] text-center text-[1.7em] font-semibold">
              {document.title}
            </h2>
            <div className="space-y-2 text-[1.08em]">
              {document.summaryFields.map((field) => renderDetailField(field))}
            </div>
          </header>

          <main className="min-h-0 flex-1 space-y-4 pt-5">
            {page.sections.map((section) => (
              <div
                key={resolvePageSectionKey(section)}
                className="group/section space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[1.08em] font-semibold">
                    {section.title}
                  </h3>
                  {onCopySection && copyActionLabel ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-primary-tint"
                      data-section-index={section.sourceIndex}
                      onClick={handleCopySectionClick}
                    >
                      <FiCopy className="h-4 w-4" />
                      {copyActionLabel}
                    </Button>
                  ) : null}
                </div>
                <div
                  className={`transition-colors ${
                    onCopySection
                      ? 'rounded-md border border-transparent px-3 py-2 group-hover/section:border-primary-tint'
                      : ''
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
          </main>

          <footer className="mt-5 shrink-0 border-t border-primary-tint/70 pt-3 text-center text-[0.92em] text-text-color/70">
            {document.pageLabel
              .replace('{{page}}', String(pageIndex + 1))
              .replace('{{total}}', String(pages.length))}
          </footer>
        </section>
      ))}
    </article>
  );
}

WeeklyReportDocument.defaultProps = {
  className: '',
  copyActionLabel: undefined,
  onCopyField: undefined,
  onCopySection: undefined,
};
