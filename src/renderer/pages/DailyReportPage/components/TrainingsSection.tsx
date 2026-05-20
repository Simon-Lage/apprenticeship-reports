import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import EditableTextEntryList from './EditableTextEntryList';

export interface TrainingsSectionProps {
  items: string[];
  suggestions: string[];
  onChange: (items: string[]) => void;
}

export default function TrainingsSection({
  items,
  suggestions,
  onChange,
}: TrainingsSectionProps) {
  const { t } = useTranslation();

  return (
    <SectionCard
      title={t('dailyReport.trainings.title')}
      description={t('dailyReport.trainings.description')}
      className="relative overflow-visible border-primary-tint bg-white"
    >
      <EditableTextEntryList
        items={items}
        placeholder={t('dailyReport.trainings.placeholder')}
        suggestions={suggestions}
        addLabel={t('dailyReport.list.addEntry')}
        removeLabel={t('dailyReport.list.removeEntry')}
        onChange={onChange}
      />
    </SectionCard>
  );
}
