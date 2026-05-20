import { SectionCard } from '@/renderer/components/app/SectionCard';
import EditableTextEntryList from './EditableTextEntryList';

export interface ActivitiesSectionProps {
  title: string;
  items: string[];
  placeholder: string;
  suggestions: string[];
  addLabel: string;
  removeLabel: string;
  onChange: (items: string[]) => void;
}

export default function ActivitiesSection({
  title,
  items,
  placeholder,
  suggestions,
  addLabel,
  removeLabel,
  onChange,
}: ActivitiesSectionProps) {
  return (
    <SectionCard
      title={title}
      preserveDescriptionSpace
      className="relative overflow-visible border-primary-tint bg-white"
    >
      <EditableTextEntryList
        items={items}
        placeholder={placeholder}
        suggestions={suggestions}
        addLabel={addLabel}
        removeLabel={removeLabel}
        onChange={onChange}
      />
    </SectionCard>
  );
}
