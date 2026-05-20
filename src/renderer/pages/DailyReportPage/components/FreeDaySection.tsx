import { useTranslation } from 'react-i18next';

import { FormField } from '@/renderer/components/app/FormField';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { Textarea } from '@/components/ui/textarea';

export interface FreeDaySectionProps {
  freeReason: string;
  onChange: (value: string) => void;
}

export default function FreeDaySection({
  freeReason,
  onChange,
}: FreeDaySectionProps) {
  const { t } = useTranslation();

  return (
    <SectionCard
      title={t('dailyReport.freeDay.title')}
      className="border-primary-tint bg-white"
    >
      <FormField id="free-reason" label={t('dailyReport.freeDay.reason')}>
        <Textarea
          id="free-reason"
          value={freeReason}
          onChange={(event) => onChange(event.target.value)}
        />
      </FormField>
    </SectionCard>
  );
}
