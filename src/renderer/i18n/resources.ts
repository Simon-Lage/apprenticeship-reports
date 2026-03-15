import deTranslation from '@/renderer/i18n/translations/de';
import enTranslation from '@/renderer/i18n/translations/en';

const resources = {
  de: {
    translation: deTranslation,
  },
  en: {
    translation: enTranslation,
  },
} as const;

export default resources;
