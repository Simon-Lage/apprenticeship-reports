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
  editSuggestionLabel?: string;
  deleteSuggestionLabel?: string;
  onEditSuggestion?: (value: string) => void;
  onDeleteSuggestion?: (value: string) => void;
}

export default function ActivitiesSection({
  title,
  items,
  placeholder,
  suggestions,
  addLabel,
  removeLabel,
  onChange,
  editSuggestionLabel,
  deleteSuggestionLabel,
  onEditSuggestion,
  onDeleteSuggestion,
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
        editSuggestionLabel={editSuggestionLabel}
        deleteSuggestionLabel={deleteSuggestionLabel}
        onEditSuggestion={onEditSuggestion}
        onDeleteSuggestion={onDeleteSuggestion}
      />
    </SectionCard>
  );
}

ActivitiesSection.defaultProps = {
  editSuggestionLabel: undefined,
  deleteSuggestionLabel: undefined,
  onEditSuggestion: undefined,
  onDeleteSuggestion: undefined,
};
