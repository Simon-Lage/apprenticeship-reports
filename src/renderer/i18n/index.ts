import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources } from '@/renderer/i18n/resources';

const defaultLanguage = 'de';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: defaultLanguage,
    fallbackLng: defaultLanguage,
    supportedLngs: Object.keys(resources),
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
