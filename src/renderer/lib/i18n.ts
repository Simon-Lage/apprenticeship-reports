import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  de: {
    translation: {
      login: {
        title: 'Anmeldung',
      },
    },
  },
  en: {
    translation: {
      login: {
        title: 'Login',
      },
    },
  },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: 'de',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
