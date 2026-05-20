import { FiCopy } from 'react-icons/fi';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { WeeklyDocumentSection } from '@/renderer/lib/weekly-report-document';
import { cn } from '@/renderer/lib/utils';

type WeeklyReportSectionCardsProps = {
  sections: WeeklyDocumentSection[];
  copyActionLabel?: string;
  onCopySection?: (sectionIndex: number) => void;
  getEntryRoute?: (date: string) => string;
};

export default function WeeklyReportSectionCards({
  sections,
  copyActionLabel,
  onCopySection,
  getEntryRoute,
}: WeeklyReportSectionCardsProps) {
  return (
    <div className="grid gap-6">
      {sections.map((section, sectionIndex) => (
        <SectionCard
          key={section.title}
          title={section.title}
          className="border-primary-tint bg-white"
          action={
            copyActionLabel && onCopySection ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-text-color/60 hover:bg-primary-tint/30 hover:text-text-color"
                aria-label={`${copyActionLabel}: ${section.title}`}
                onClick={() => onCopySection(sectionIndex)}
              >
                <FiCopy className="size-4" />
              </Button>
            ) : null
          }
        >
          {section.entries.length ? (
            <div className="rounded-md border border-primary-tint/70 bg-primary-tint/10 px-4 py-3">
              {section.entries.map((entry) => {
                const entryContent = (
                  <>
                    <h3 className="text-sm font-semibold text-text-color">
                      {entry.heading}
                    </h3>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text-color/75">
                      {entry.items.map((item) => (
                        <li key={`${entry.heading}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </>
                );
                const entryClassName = cn(
                  'block border-b border-primary-tint/60 py-3 first:pt-0 last:border-b-0 last:pb-0',
                  getEntryRoute &&
                    'cursor-pointer rounded-md outline-none transition-colors hover:bg-primary-tint/20 active:bg-primary-tint/30 focus-visible:ring-2 focus-visible:ring-primary/35',
                );

                return getEntryRoute ? (
                  <Link
                    key={entry.heading}
                    to={getEntryRoute(entry.date)}
                    className={entryClassName}
                  >
                    {entryContent}
                  </Link>
                ) : (
                  <section key={entry.heading} className={entryClassName}>
                    {entryContent}
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-text-color/70">{section.emptyValue}</p>
          )}
        </SectionCard>
      ))}
    </div>
  );
}

WeeklyReportSectionCards.defaultProps = {
  copyActionLabel: undefined,
  onCopySection: undefined,
  getEntryRoute: undefined,
};
