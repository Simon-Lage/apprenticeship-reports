import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  de: {
    translation: {
      login: {
        title: 'Anmeldung',
        password: 'Passwort',
        showPassword: 'Anzeigen',
        hidePassword: 'Verbergen',
        passwordSubmit: 'Mit Passwort anmelden',
        google: 'Mit Google anmelden',
        errors: {
          passwordRequired: 'Bitte Passwort eingeben.',
          generic: 'Anmeldung fehlgeschlagen.',
        },
      },
      welcome: {
        title: 'Willkommen',
        description:
          'Dieses Programm hilft dir, Ausbildungsnachweise schnell und strukturiert zu erstellen.',
        start: 'Los gehts',
      },
      setupPassword: {
        title: 'Passwort festlegen',
        description:
          'Das Passwort ist der wichtigste Zugangsschlüssel und wird für den Zugriff auf deine Daten benötigt.',
        password: 'Passwort',
        confirm: 'Passwort wiederholen',
        showPassword: 'Anzeigen',
        hidePassword: 'Verbergen',
        requirements: {
          title: 'Das Passwort braucht mindestens:',
          minLength: '8 Zeichen.',
          uppercase: '1 Großbuchstabe.',
          lowercase: '1 Kleinbuchstabe.',
          number: '1 Zahl.',
          special: '1 Sonderzeichen.',
        },
        match: 'Passwörter stimmen überein.',
        noMatch: 'Passwörter stimmen nicht überein.',
        submit: 'Passwort setzen',
        errors: {
          generic: 'Passwort konnte nicht gesetzt werden.',
        },
      },
      setupGoogle: {
        title: 'Google hinzufügen',
        description:
          'Du kannst ein Google-Konto als alternative Anmeldung hinzufügen.',
        reminder:
          'Das Passwort bleibt der wichtigste Zugang und darf niemals verloren gehen.',
        link: 'Google-Konto verbinden',
        skip: 'Überspringen',
        loading: {
          title: 'Google-Login wird vorbereitet.',
          description:
            'Bitte das Browser-Fenster am Ende schließen, um den Vorgang abzuschließen.',
        },
        errors: {
          generic: 'Google-Konto konnte nicht verbunden werden.',
          missingClientId:
            'Google-Login ist nicht konfiguriert. Bitte Client-ID hinterlegen.',
          notAuthenticated: 'Bitte zuerst mit deinem Passwort anmelden.',
          accountMismatch: 'Das Google-Konto stimmt nicht mit dem verknüpften Konto überein.',
          timeout: 'Anmeldung abgebrochen oder zu lange offen.',
          exchangeFailed: 'Google-Antwort konnte nicht verarbeitet werden.',
          invalidToken: 'Google-Anmeldung ist ungültig.',
          details: 'Details: {{details}}',
        },
      },
      onboarding: {
        title: 'Onboarding',
        description: 'Dies ist der nächste Schritt. Weitere folgen später.',
        next: 'Weiter',
      },
      dashboard: {
        title: 'Dashboard',
        resetPassword: 'Passwort bestätigen',
        addGoogle: 'Google-Konto hinzufügen',
        reset: 'Anwendung zurücksetzen',
        errors: {
          passwordRequired: 'Bitte Passwort eingeben.',
          generic: 'Zurücksetzen fehlgeschlagen.',
        },
      },
    },
  },
  en: {
    translation: {
      login: {
        title: 'Login',
        password: 'Password',
        showPassword: 'Show',
        hidePassword: 'Hide',
        passwordSubmit: 'Sign in with password',
        google: 'Sign in with Google',
        errors: {
          passwordRequired: 'Please enter a password.',
          generic: 'Login failed.',
        },
      },
      welcome: {
        title: 'Welcome',
        description:
          'This app helps you create apprenticeship reports quickly and in a structured way.',
        start: "Let's start",
      },
      setupPassword: {
        title: 'Set password',
        description:
          'The password is the most important access key and is required to access your data.',
        password: 'Password',
        confirm: 'Repeat password',
        showPassword: 'Show',
        hidePassword: 'Hide',
        requirements: {
          title: 'Password must include at least:',
          minLength: 'At least 8 characters.',
          uppercase: 'At least 1 uppercase letter.',
          lowercase: 'At least 1 lowercase letter.',
          number: 'At least 1 number.',
          special: 'At least 1 special character.',
        },
        match: 'Passwords match.',
        noMatch: 'Passwords do not match.',
        submit: 'Set password',
        errors: {
          generic: 'Password could not be set.',
        },
      },
      setupGoogle: {
        title: 'Add Google',
        description: 'You can add a Google account as an alternative login.',
        reminder:
          'The password remains the most important access and must not be lost.',
        link: 'Connect Google account',
        skip: 'Skip',
        loading: {
          title: 'Preparing Google login.',
          description: 'Please close the browser window at the end to complete the flow.',
        },
        errors: {
          generic: 'Google account could not be connected.',
          missingClientId:
            'Google login is not configured. Please set a client ID.',
          notAuthenticated: 'Please sign in with your password first.',
          accountMismatch: 'Google account does not match the linked account.',
          timeout: 'Login cancelled or took too long.',
          exchangeFailed: 'Google response could not be processed.',
          invalidToken: 'Google login is invalid.',
          details: 'Details: {{details}}',
        },
      },
      onboarding: {
        title: 'Onboarding',
        description: 'This is the next step. More will follow later.',
        next: 'Next',
      },
      dashboard: {
        title: 'Dashboard',
        resetPassword: 'Confirm password',
        addGoogle: 'Add Google account',
        reset: 'Reset application',
        errors: {
          passwordRequired: 'Please enter a password.',
          generic: 'Reset failed.',
        },
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
