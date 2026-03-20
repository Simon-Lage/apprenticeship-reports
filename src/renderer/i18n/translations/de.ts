const deTranslation = {
  appState: {
    bridgeMissingTitle: 'Electron Bridge nicht verfügbar',
    bridgeMissingDescription:
      'Die Anwendung kann ohne Renderer-Bridge keine Daten laden.',
    loadingTitle: 'Anwendung wird geladen',
    loadingDescription: 'Bootstrap-Status wird geprüft.',
    errorTitle: 'Bootstrap-Fehler',
    retry: 'Erneut laden',
  },
  common: {
    loading: 'Lädt...',
    add: 'Hinzufügen',
    edit: 'Bearbeiten',
    remove: 'Entfernen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    yes: 'Ja',
    no: 'Nein',
    unsavedChanges: {
      title: 'Ungespeicherte Änderungen',
      description:
        'Du hast ungespeicherte Änderungen. Möchtest du vor dem Verlassen speichern?',
      save: 'Speichern',
      discard: 'Verwerfen',
      cancel: 'Weiter anlegen',
    },
    password: {
      show: 'Passwort anzeigen',
      hide: 'Passwort ausblenden',
    },
    errors: {
      unknown: 'Unbekannter Fehler.',
    },
  },
  reportConflicts: {
    badge: 'Konflikt',
    storedState: 'Gespeichert: {{value}}',
    expectedState: 'Aktuell erwartet: {{value}}',
    reason: 'Auslöser: {{value}}',
    dailyTitle: 'Abwesenheitskonflikt erkannt',
    dailyDescription:
      'Der gespeicherte Tagesbericht passt nicht mehr zu den aktuellen Abwesenheiten, Feiertagen oder Ferien.',
    weeklyTitle: '{{count}} Konflikt(e) in dieser Woche',
    weeklyDescription:
      'Diese Woche ist noch nicht als gesendet markiert. Prüfe die betroffenen Tage und entscheide bewusst, ob du den Tagesbericht oder die Abwesenheiten anpassen willst.',
    weeklyItem:
      '{{date}}: gespeichert {{stored}}, erwartet {{expected}}, Auslöser {{reason}}',
  },
  navigation: {
    brand: 'AppRep',
    home: 'Start',
    dailyReport: 'Tagesbericht',
    absences: 'Abwesenheiten',
    weeklyReport: 'Wochenbericht',
    reportsOverview: 'Übersicht',
    timeTable: 'Stundenplan',
    import: 'Import',
    export: 'Export',
    settings: 'Settings',
    changeAuthMethods: 'Zugang',
    logout: 'Ausloggen',
    logoutConfirmTitle: 'Ausloggen bestätigen',
    logoutConfirmDescription: 'Bist du sicher, dass du dich ausloggen willst?',
    logoutError: 'Ausloggen fehlgeschlagen.',
  },
  windowMode: {
    switchToFullscreen: 'In Vollbild wechseln',
    switchToWindowed: 'In Fenstermodus wechseln',
  },
  login: {
    title: 'Anmeldung',
    description: 'Melde dich mit Passwort oder optional mit Google an.',
    passwordLabel: 'Passwort',
    rememberMe: 'Angemeldet bleiben',
    passwordSubmit: 'Mit Passwort anmelden',
    googleTitle: 'Google-Anmeldung',
    googleSubmit: 'Mit Google anmelden',
    googleDisabledHint: 'Es wurde noch kein Google-Konto hinterlegt.',
    googleUnavailableHint: 'Google OAuth ist nicht konfiguriert.',
    validation: {
      passwordRequired: 'Bitte ein Passwort eingeben.',
    },
    feedback: {
      passwordSuccess: 'Passwort-Anmeldung erfolgreich.',
      passwordError: 'Passwort-Anmeldung fehlgeschlagen.',
      googleSuccess: 'Google-Anmeldung erfolgreich.',
      googleError: 'Google-Anmeldung fehlgeschlagen.',
    },
  },
  onboarding: {
    welcome: {
      kicker: 'AppRep',
      title: 'Willkommen bei AppRep',
      description:
        'Diese Anwendung hilft dir, Tages- und Wochenberichte strukturiert zu erfassen, zu exportieren und sicher zu sichern.',
      start: 'Los geht’s',
      features: {
        dailyTitle: 'Tagesberichte',
        dailyDescription:
          'Dokumentiere jeden Tag präzise mit Tätigkeiten, Schulthemen und Schulungen.',
        weeklyTitle: 'Wochenberichte',
        weeklyDescription:
          'Erstelle vollständige Wochenberichte mit klarer Struktur und PDF-Ausgabe.',
        syncTitle: 'Import & Export',
        syncDescription:
          'Nutze JSON-Import/Export und sichere Datenflüsse mit Vergleichsansicht.',
        setupTitle: 'Sicherer Start',
        setupDescription:
          'Im nächsten Schritt richtest du dein verpflichtendes lokales Passwort ein.',
      },
    },
    password: {
      title: 'Passwort festlegen',
      passwordLabel: 'Passwort festlegen',
      confirmLabel: 'Passwort wiederholen',
      submit: 'Passwort speichern',
      requirementsTitle: 'Passwort-Anforderungen',
      validationRules: 'Bitte erfülle alle Passwort-Anforderungen.',
      validationMatch: 'Die Passwörter stimmen nicht überein.',
      rules: {
        minLength: 'Mindestens 8 Zeichen',
        lowercase: 'Mindestens ein Kleinbuchstabe',
        uppercase: 'Mindestens ein Großbuchstabe',
        number: 'Mindestens eine Zahl',
        special: 'Mindestens ein Sonderzeichen',
        repeatMatches: 'Passwort wiederholen entspricht dem Passwort',
      },
    },
    progress: {
      title: 'Fortschritt',
      counter: '{{done}} von {{total}} Schritten',
      stateDone: 'Erledigt',
      stateCurrent: 'Aktuell',
      statePending: 'Offen',
    },
    completed: {
      title: 'Onboarding abgeschlossen',
      description: 'Alle erforderlichen Angaben sind vorhanden.',
    },
    validation: {
      generic: 'Bitte prüfe die Eingaben.',
    },
    actions: {
      back: 'Zurück',
      next: 'Weiter',
      finish: 'Abschließen',
    },
    feedback: {
      passwordSetupSuccess: 'Passwort wurde eingerichtet.',
      passwordSetupError: 'Passwort konnte nicht eingerichtet werden.',
      stepCompleted: 'Onboarding-Schritt abgeschlossen.',
      stepSaved: 'Entwurf gespeichert.',
      stepSkipped: 'Optionaler Schritt übersprungen.',
      stepError: 'Onboarding-Aktion fehlgeschlagen.',
      googleLinked: 'Google-Konto wurde verknüpft.',
    },
    steps: {
      google: {
        title: 'Google',
        description: 'Optionales Google-Konto für alternative Anmeldung.',
        optionalTitle: 'Optionaler Schritt',
        optionalDescription:
          'Du kannst diesen Schritt überspringen und später in den Einstellungen ein Google-Konto verknüpfen.',
        unavailableTitle: 'Google derzeit nicht verfügbar',
        unavailableDescription:
          'Google OAuth ist in dieser Umgebung nicht konfiguriert. Du kannst diesen optionalen Schritt überspringen.',
        browserHint:
          'Beim Verbinden wird das Auth-Fenster im Browser geöffnet. Nach erfolgreicher Anmeldung musst du dieses Fenster schließen.',
        connectedTitle: 'Google-Konto verknüpft',
        connectedDescription:
          'Ein Google-Konto wurde erfolgreich mit der App verknüpft.',
        connectedDescriptionWithEmail:
          'Ein Google-Konto wurde erfolgreich verknüpft: {{email}}',
        connect: 'Google verbinden',
        switchAccount: 'Account wechseln',
        validationEmail: 'Bitte eine gültige E-Mail eintragen.',
      },
      identity: {
        title: 'Identität',
        description: 'Basisdaten für die lokale Kontoidentität.',
        firstName: 'Vorname',
        lastName: 'Nachname',
        apprenticeIdentifier: 'Azubi-Identnummer',
        profession: 'Berufsbezeichnung',
        validationApprenticeIdentifier:
          'Die Azubi-Identnummer darf nur aus Ziffern bestehen.',
      },
      'training-period': {
        title: 'Ausbildungszeitraum',
        description:
          'Start und Ende der Ausbildung sowie optionaler Startpunkt für Berichte.',
      },
      region: {
        title: 'Bundesland',
        description: 'Wähle dein Bundesland für Feiertags- und Ferienimport.',
        subdivisionCode: 'Bundesland',
        placeholder: 'Bitte Bundesland auswählen',
        validationSubdivision: 'Bitte ein gültiges Bundesland auswählen.',
        options: {
          'DE-BB': 'Brandenburg',
          'DE-BE': 'Berlin',
          'DE-BW': 'Baden-Württemberg',
          'DE-BY': 'Bayern',
          'DE-HB': 'Bremen',
          'DE-HE': 'Hessen',
          'DE-HH': 'Hamburg',
          'DE-MV': 'Mecklenburg-Vorpommern',
          'DE-NI': 'Niedersachsen',
          'DE-NW': 'Nordrhein-Westfalen',
          'DE-RP': 'Rheinland-Pfalz',
          'DE-SH': 'Schleswig-Holstein',
          'DE-SL': 'Saarland',
          'DE-SN': 'Sachsen',
          'DE-ST': 'Sachsen-Anhalt',
          'DE-TH': 'Thüringen',
        },
      },
      trainingPeriod: {
        start: 'Ausbildungsbeginn',
        end: 'Ausbildungsende',
        reportsSince: 'Ausbildungsberichte seit (optional)',
        reportsSinceHint:
          'Wenn gesetzt, beginnt die Berichtsplanung ab diesem Datum statt ab Ausbildungsbeginn.',
        validationRange:
          'Das Ausbildungsende muss nach dem Ausbildungsbeginn liegen.',
        validationReportsSinceRange:
          'Das Berichtsstart-Datum muss innerhalb des Ausbildungszeitraums liegen.',
      },
      workplace: {
        title: 'Arbeitsplatz',
        description: 'Pflichtdaten zu Ausbildungsabschnitt und Betreuung.',
        department: 'Abteilung',
        trainerEmail: 'E-Mail Betreuer',
        ihkLink: 'IHK-Link',
        validationDepartmentRequired: 'Bitte eine Abteilung eintragen.',
        validationTrainerEmailRequired: 'Bitte eine Betreuer-E-Mail eintragen.',
        validationEmail: 'Bitte eine gültige E-Mail eintragen.',
        validationUrl: 'Bitte eine gültige URL eintragen.',
      },
    },
  },
  home: {
    hero: {
      kicker: 'AppRep',
      title: 'Dein Tool für Ausbildungsberichte!',
      description:
        'Erfasse Tages- und Wochenberichte strukturiert und springe direkt in die Bereiche, die du gerade brauchst.',
    },
    actions: {
      captureDay: 'Tagesbericht schreiben',
      allReports: 'Alle Berichte',
    },
    stats: {
      dailyReports: 'Tagesberichte',
      weeklyReports: 'Wochenberichte',
      totalEntries: 'Tage mit Berichten',
      backlogDays: 'Rückstand',
      backlogDaysDescription:
        'So viele Kalendertage im aktuellen Berichtszeitraum haben noch keinen Tagesbericht.',
      sameDayRate: 'Am selben Tag',
      sameDayRateDescription:
        'Anteil der Tagesberichte, die direkt am passenden Datum erfasst wurden.',
      averageBatchSize: 'Pro Erfassungstag',
      averageBatchSizeDescription:
        'Im Schnitt so viele Tagesberichte pro Tag, an dem du überhaupt Berichte eingetragen hast: {{count}} Erfassungstage.',
      entryModes: 'Manuell / Automatisch',
      entryModesValue: '{{manual}} / {{automatic}}',
      entryModesDescription:
        'Vergleich zwischen selbst erfassten und automatisch angelegten Tagesberichten.',
      insightTitle: 'Berichtsstand',
      insightDescription:
        'Aktuell fehlen {{backlog}} Tage. {{sameDayRate}} der Tagesberichte wurden direkt am selben Tag erfasst. Manuell: {{manual}}, automatisch: {{automatic}}.',
    },
    areas: {
      daily: {
        title: 'Tagesbericht',
        description: 'Neuen Tag erfassen und bestehende Inhalte bearbeiten.',
      },
      weekly: {
        title: 'Wochenbericht',
        description: 'Wocheninhalte konsolidieren und als Bericht pflegen.',
      },
      overview: {
        title: 'Berichte Übersicht',
        description: 'Berichte filtern und verwalten.',
      },
      timetable: {
        title: 'Stundenplan',
        description: 'Schulfächer, Lehrer und Presets zentral verwalten.',
      },
      import: {
        title: 'Import',
        description: 'JSON-Daten und Settings mit Vergleichsansicht einlesen.',
      },
      export: {
        title: 'Export',
        description: 'Berichte und Settings lokal oder nach Drive exportieren.',
      },
      settings: {
        title: 'Settings',
        description: 'Standardwerte und Anwendungseinstellungen anpassen.',
      },
      absences: {
        title: 'Abwesenheiten',
        description:
          'Krankheit, Urlaub sowie Feiertage und Ferien zentral verwalten.',
      },
    },
  },
  absences: {
    title: 'Abwesenheiten',
    description:
      'Verwalte manuelle Abwesenheiten und automatisch importierte Feiertage/Ferien.',
    confirmDelete: {
      title: '{{type}} löschen?',
      description: '"{{value}}" wird dauerhaft entfernt.',
      cancel: 'Abbrechen',
      confirm: 'Löschen',
    },
    sync: {
      title: 'Feiertage und Ferien',
      description:
        'Wird beim ersten Anmelden, bei einer Änderung des Bundeslandes oder am 1. Januar automatisch synchronisiert. Zusätzlich jederzeit manuell synchronisierbar.',
      stateLabel: 'Bundesland',
      syncedAt: 'Letzte Synchronisierung',
      lastError: 'Letzter Fehler',
      currentYear: 'Datenjahr',
      catalogYears: 'Vorhandene Jahre',
      autoSyncSetting: 'Automatische Synchronisierung',
      trigger: 'Jetzt synchronisieren',
      missingRegion:
        'Kein Bundesland im Onboarding hinterlegt. Bitte Onboarding abschließen.',
      outdatedTitle: 'Daten veraltet',
      outdatedDescription:
        'Die lokalen Feiertags- und Ferieninformationen aus {{years}} sind veraltet.',
      confirmTitle: 'Feiertage und Ferien synchronisieren?',
      confirmDescription:
        'Möchtest du die Feiertage und Ferien jetzt synchronisieren? Dafür wird eine Verbindung zum externen Drittanbieter OpenHolidays API hergestellt und die lokalen Feiertags- und Ferienkataloge für das betroffene Jahr werden überschrieben.',
      syncNowConfirmTitle: 'Jetzt synchronisieren?',
      syncNowConfirmDescription:
        'Möchtest du die Feiertage und Ferien jetzt synchronisieren? Dafür wird eine Verbindung zum externen Drittanbieter OpenHolidays API hergestellt und die lokalen Feiertags- und Ferienkataloge für das betroffene Jahr werden überschrieben.',
      warningTitle: 'Externer Abruf und Überschreiben',
      warningDescription:
        'Die Synchronisation überschreibt die lokal gespeicherten Feiertags- und Ferienkataloge für das betroffene Jahr mit Daten der OpenHolidays API.',
      autoSyncLabel: 'Zukünftig automatisch synchronisieren',
      enableAutoSyncLabel: 'Automatische Synchronisierung wieder aktivieren',
      confirmButton: 'Jetzt synchronisieren',
      dismissButton: 'Vorerst nicht',
    },
    manual: {
      title: 'Manuelle Abwesenheiten',
      description: 'Krankheit, Urlaub sowie manuelle Ferien/Feiertage.',
      summary: 'Krankheit/Urlaub aufklappen',
      startDate: 'Von',
      endDate: 'Bis',
      type: 'Typ',
      label: 'Bezeichnung',
      note: 'Notiz',
      add: 'Eintrag speichern',
      update: 'Eintrag aktualisieren',
      cancelEdit: 'Bearbeitung abbrechen',
      empty: 'Keine manuellen Abwesenheiten vorhanden.',
      emptyType: 'Keine {{type}}-Einträge vorhanden.',
      edit: 'Bearbeiten',
      delete: 'Löschen',
      editEntry: '{{type}} bearbeiten',
      deleteEntry: '{{type}} löschen',
      types: {
        sick: 'Krankheit',
        vacation: 'Urlaub',
        publicHoliday: 'Feiertag',
        schoolHoliday: 'Ferien',
      },
    },
    catalog: {
      title: 'Feiertage und Ferien',
      description:
        'Synchronisierte und manuelle Feiertage/Ferien zentral verwalten.',
      summary: 'Feiertage/Ferien aufklappen',
      publicTitle: 'Feiertage',
      schoolTitle: 'Ferien',
      empty: 'Keine Daten verfügbar.',
      emptyType: 'Keine {{type}}-Einträge vorhanden.',
      outdated: 'Veraltet',
      sources: {
        manual: 'Manuell',
        synced: 'Synchronisiert',
      },
    },
    feedback: {
      missingDate: 'Bitte gültige Datumswerte angeben.',
      invalidRange: 'Das Enddatum muss am oder nach dem Startdatum liegen.',
      labelRequiredForHolidayType:
        'Für Feiertage und Ferien ist eine Bezeichnung erforderlich.',
      saved: 'Abwesenheiten gespeichert.',
      saveError: 'Abwesenheiten konnten nicht gespeichert werden.',
      deleted: 'Eintrag gelöscht.',
      syncSuccess: 'Abwesenheitsdaten synchronisiert.',
      syncError: 'Abwesenheitsdaten konnten nicht synchronisiert werden.',
    },
    unsavedChanges: {
      save: 'Abwesenheiten speichern',
      discard: 'Abwesenheiten verwerfen',
      cancel: 'Abwesenheiten weiter anlegen',
    },
  },
  authMethods: {
    title: 'Authentifizierungsmethoden',
    description: 'Passwort bleibt Pflicht, Google ist optional ergänzend.',
    password: {
      title: 'Passwort ändern',
      description: 'Neues Passwort setzen und bestätigen.',
      current: 'Aktuelles Passwort',
      next: 'Neues Passwort',
      submit: 'Passwort aktualisieren',
    },
    google: {
      title: 'Google-Konto',
      description: 'Google-Konto verbinden, wechseln oder entfernen.',
      notLinked: 'Kein Google-Konto verknüpft',
      unavailable: 'Google OAuth ist nicht konfiguriert.',
      browserHint:
        'Beim Verbinden wird das Auth-Fenster im Browser geöffnet. Nach erfolgreicher Anmeldung musst du dieses Fenster schließen.',
      connect: 'Google verbinden',
      switch: 'Google wechseln',
      remove: 'Google entfernen',
    },
    confirm: {
      cancel: 'Abbrechen',
      password: {
        title: 'Passwort wirklich ändern?',
        description: 'Möchtest du das lokale Passwort jetzt wirklich ändern?',
        confirm: 'Passwort ändern',
      },
      googleRemove: {
        title: 'Google-Konto wirklich entfernen?',
        description: 'Möchtest du die Google-Verknüpfung wirklich entfernen?',
        confirm: 'Google-Konto entfernen',
      },
    },
    feedback: {
      passwordFieldsRequired: 'Bitte beide Passwortfelder ausfüllen.',
      passwordChanged: 'Passwort wurde aktualisiert.',
      passwordError: 'Passwort konnte nicht aktualisiert werden.',
      googleLinked: 'Google-Konto wurde verknüpft.',
      googleRemoved: 'Google-Verknüpfung wurde entfernt.',
      googleError: 'Google-Aktion fehlgeschlagen.',
    },
  },
  settings: {
    title: 'Settings',
    description: 'Globale Einstellungen, Import und Export.',
    save: 'Speichern',
    reset: 'Zurücksetzen',
    loadingTitle: 'Settings werden geladen',
    loadingDescription: 'Die aktuellen Einstellungen werden abgerufen.',
    general: {
      title: 'Allgemein',
      description: 'Standardwerte für Berichte und Betreuung.',
      apprenticeIdentifier: 'Azubi-Identnummer',
      profession: 'Berufsbezeichnung',
      department: 'Ausbildungsabschnitt/Abteilung',
      supervisorPrimary: 'Betreuer-E-Mail',
      supervisorSecondary: 'Betreuer-E-Mail 2',
      ihkLink: 'IHK-Link',
      googleAccount: 'Verknüpftes Google-Konto',
      linkGoogleAccount: 'Google-Konto verknüpfen',
    },
    trainingPeriod: {
      title: 'Ausbildungszeitraum',
      description:
        'Steuert den Startpunkt für Tages- und Wochenberichte sowie den gültigen Zeitraum.',
      start: 'Ausbildungsbeginn',
      end: 'Ausbildungsende',
      reportsSince: 'Ausbildungsberichte seit (optional)',
    },
    region: {
      title: 'Bundesland',
      description:
        'Wird für den Import von Feiertagen und Ferien über Open Holidays verwendet.',
      subdivisionCode: 'Bundesland',
      placeholder: 'Bitte Bundesland auswählen',
      autoSyncHolidays: 'Automatisch synchronisieren',
      autoSyncDescription:
        'Feiertage und Ferien beim App-Start oder Regionswechsel automatisch aktuell halten.',
    },
    exchange: {
      title: 'Settings Import/Export',
      description: 'Settings als JSON exportieren oder importieren.',
      export: 'Settings exportieren',
      import: 'Settings importieren',
    },
    compare: {
      title: 'Vergleichsansicht',
      description: 'Vor dem Überschreiben werden Unterschiede angezeigt.',
      cancel: 'Import abbrechen',
      apply: 'Import anwenden',
      diffCount: 'Anzahl Unterschiede',
      currentTitle: 'Aktuelle Settings',
      incomingTitle: 'Importierte Settings',
    },
    feedback: {
      saved: 'Settings gespeichert.',
      saveError: 'Settings konnten nicht gespeichert werden.',
      exported: 'Settings exportiert.',
      exportCanceled: 'Settings-Export abgebrochen.',
      exportError: 'Settings-Export fehlgeschlagen.',
      importPrepared: 'Settings-Import vorbereitet.',
      importPrepareError: 'Settings-Import konnte nicht vorbereitet werden.',
      importApplied: 'Settings-Import angewendet.',
      importApplyError: 'Settings-Import fehlgeschlagen.',
      importCanceled: 'Settings-Import abgebrochen.',
    },
  },
  timeTable: {
    title: 'Stundenplan',
    description: 'Preset-Stundenplan inklusive Lehrer- und Fächerlisten.',
    save: 'Speichern',
    reset: 'Zurücksetzen',
    days: {
      monday: 'Montag',
      tuesday: 'Dienstag',
      wednesday: 'Mittwoch',
      thursday: 'Donnerstag',
      friday: 'Freitag',
    },
    schedule: {
      title: 'Plan',
      description: 'Fach und Lehrer je Stunde festlegen.',
      lesson: 'Stunde',
      subjectPlaceholder: 'Fach',
      teacherPlaceholder: 'Lehrer',
    },
    config: {
      title: 'Konfiguration',
      description: 'Lehrer- und Fächerlisten direkt verwalten.',
      summary: 'Lehrer/Fächer aufklappen',
      newTeacher: 'Neuen Lehrer hinzufügen',
      newSubject: 'Neues Fach hinzufügen',
      actions: {
        addTeacher: 'Lehrer hinzufügen',
        addSubject: 'Fach hinzufügen',
        editEntry: '"{{value}}" bearbeiten',
        saveEntry: 'Änderung speichern',
        cancelEdit: 'Bearbeitung abbrechen',
        removeEntry: '"{{value}}" entfernen',
      },
    },
    confirmAdd: {
      teacherTitle: 'Lehrer hinzufügen?',
      subjectTitle: 'Fach hinzufügen?',
      description: '"{{value}}" ist noch nicht in der Liste.',
      cancel: 'Nein',
      confirm: 'Hinzufügen',
    },
    confirmDelete: {
      teacherTitle: 'Lehrer löschen?',
      subjectTitle: 'Fach löschen?',
      description:
        '"{{value}}" wird aus der Liste und aus allen Stundenplanfeldern entfernt.',
      cancel: 'Abbrechen',
      confirm: 'Löschen',
    },
    feedback: {
      saved: 'Stundenplan gespeichert.',
      saveError: 'Stundenplan konnte nicht gespeichert werden.',
      teacherRequired: 'Bitte einen Lehrernamen eingeben.',
      subjectRequired: 'Bitte einen Fachnamen eingeben.',
      teacherExists: 'Dieser Lehrer existiert bereits.',
      subjectExists: 'Dieses Fach existiert bereits.',
    },
  },
  dailyReport: {
    title: 'Tagesbericht',
    description:
      'Tagestypabhängige Erfassung mit Tätigkeiten und Schulanteilen.',
    dayTypes: {
      work: 'Arbeitstag',
      school: 'Schultag',
      free: 'Freier Tag',
    },
    meta: {
      title: 'Tagestyp - Datum',
      titleWithValues: '{{dayType}} - {{date}}',
      description: 'Datum und Tagestyp festlegen.',
      editingDescription: 'Du bearbeitest den Tagesbericht vom {{date}}.',
      creatingDescription: 'Du legst einen neuen Tagesbericht für {{date}} an.',
      submittedDescription:
        'Du siehst den gesendeten Tagesbericht vom {{date}}.',
      weekStart: 'Wochenstart',
      weekEnd: 'Wochenende',
      date: 'Datum',
      dayType: 'Tagestyp',
    },
    calendar: {
      title: 'Tageskalender',
      description:
        'Wähle einen Tag aus und erkenne sofort, welche Berichte schon gesendet, nur gespeichert oder noch offen sind.',
      legendSubmitted: 'Bereits gesendet',
      legendDraft: 'Eingetragen, noch nicht gesendet',
      legendEmpty: 'Noch kein Tagesbericht',
    },
    status: {
      editingTitle: 'Bearbeitungsmodus',
      editingDescription: 'Du bearbeitest den Tagesbericht vom {{date}}.',
      submittedTitle: 'Nur Lesemodus',
      submittedDescription:
        'Dieser Tagesbericht gehört zu einem bereits gesendeten Wochenbericht und kann nicht mehr bearbeitet werden.',
      submittedAt: 'Gesendet am {{date}}.',
    },
    auto: {
      reasonPublicHoliday: 'Automatisch erkannt: Feiertag ({{name}}).',
      reasonWeekend: 'Automatisch erkannt: Wochenende.',
      reasonSick: 'Automatisch erkannt: Krankheit ({{name}}).',
      reasonVacation: 'Automatisch erkannt: Urlaub ({{name}}).',
      reasonSchoolHoliday:
        'Automatisch erkannt: Ferien ({{name}}), Schultag wird zu Arbeitstag.',
      reasonBaseSchool: 'Automatisch erkannt: Schultag (laut Stundenplan).',
      reasonBaseWork: 'Automatisch erkannt: Arbeitstag.',
    },
    freeDay: {
      title: 'Freier Tag',
      reason: 'Grund (Urlaub, krank, Feiertag, ...)',
    },
    activities: {
      title: 'Tätigkeiten',
      workTitleForSchoolDay: 'Arbeitstätigkeiten (Betrieb)',
      description: 'Suchbare Eintragsliste mit wiederverwendbaren Vorschlägen.',
      placeholder: 'Tätigkeit eintragen',
    },
    school: {
      title: 'Schultätigkeiten',
      addLesson: 'Stunde hinzufügen',
      lessonNumberOption: 'Stunde {{lesson}}',
      subjectPlaceholder: 'Fach',
      teacherPlaceholder: 'Lehrer',
      topicPlaceholder: 'Thema',
    },
    trainings: {
      title: 'Unterweisungen & Schulungen',
      description:
        'Unterweisungen, betrieblicher Unterricht und sonstige Schulungen getrennt erfassen.',
      placeholder: 'Eintrag',
    },
    actions: {
      save: 'Tagesbericht speichern',
      saveChanges: 'Änderungen speichern',
      cancel: 'Abbrechen',
      delete: 'Tagesbericht löschen',
    },
    deleteDialog: {
      title: 'Tagesbericht löschen?',
      description:
        'Soll der Tagesbericht vom {{date}} wirklich gelöscht werden?',
    },
    feedback: {
      missingDates: 'Bitte ein gültiges Datum angeben.',
      missingFreeReason:
        'Bei freien Tagen muss ein genauer Grund eingetragen werden.',
      missingWorkEntries:
        'Bei Arbeitstagen muss mindestens eine Arbeitstätigkeit oder eine Schulung eingetragen werden.',
      missingSchoolLessonTopics:
        'Bei Schultagen muss für jede Schulstunde mindestens ein Thema eingetragen sein.',
      duplicateActivityForDate:
        'Diese Tätigkeit ist für den {{date}} schon eingetragen.',
      saved: 'Tagesbericht gespeichert.',
      deleted: 'Tagesbericht gelöscht.',
      saveError: 'Tagesbericht konnte nicht gespeichert werden.',
    },
    unsavedChanges: {
      save: 'Tagesbericht speichern',
      discard: 'Tagesbericht verwerfen',
      cancel: 'Tagesbericht weiter anlegen',
    },
  },
  weeklyReport: {
    title: 'Wochenbericht',
    description: 'Aggregierte Wocheninhalte aus Tagesberichten und Metadaten.',
    form: {
      area: 'Ausbildungsabschnitt/Abteilung',
      supervisorEmail: 'Betreuer-E-Mail',
    },
    stats: {
      trackedDays: 'Berichte für {{count}} von {{total}} Tagen erfasst',
    },
    meta: {
      title: 'Wochenstatus',
      weekRange: 'Zeitraum',
      weekHeadline: 'Woche {{start}} bis {{end}}',
      area: 'Ausbildungsabschnitt/Abteilung',
      supervisorPrimary: 'Betreuer-E-Mail',
      submitted: 'Bereits abgeschickt',
      daysTracked: 'Tage in dieser Woche',
      daysTrackedHeadline: 'Tagesberichte erfasst: {{done}}/{{total}}',
      weekendAutoReason: 'Wochenende',
      noWeek: 'Keine passende Woche mit Tagesberichten gefunden.',
    },
    sections: {
      metadata: {
        title: 'Wochenmetadaten',
        titleWithRange: 'Wochenbericht {{start}} - {{end}}',
      },
      operational: {
        title: 'Betriebliche Tätigkeiten',
      },
      instructional: {
        title:
          'Unterweisungen / betrieblicher Unterricht / sonstige Schulungen',
      },
      school: {
        title: 'Berufsschule (Unterrichtsthemen)',
      },
      summary: {
        title: 'Wochenzusammenfassung',
        description: 'Status der Erfassung für die aktuelle Woche.',
      },
    },
    actions: {
      reset: 'Zurücksetzen',
      save: 'Wochenbericht speichern',
      send: 'Wochenbericht senden',
      exportPdf: 'Als PDF exportieren',
    },
    notifications: {
      saved: 'Wochenbericht wurde gespeichert.',
      saveFailed: 'Wochenbericht konnte nicht gespeichert werden.',
      autoFillFailed: 'Automatisches Ausfüllen der freien Tage fehlgeschlagen.',
    },
    status: {
      submitted: 'Bericht abgeschickt',
    },
    feedback: {
      missingRange: 'Es ist keine gültige Woche ausgewählt.',
      saved: 'Wochenbericht gespeichert.',
      saveError: 'Wochenbericht konnte nicht gespeichert werden.',
    },
  },
  weeklyDocument: {
    title: 'Ausbildungsnachweis',
    emptyValue: '-',
    labels: {
      name: 'Name:',
      apprenticeIdentifier: 'Azubi-Ident-Nummer:',
      profession: 'Beruf:',
      trainingPeriod: 'Ausbildungszeitraum:',
      rangeStart: 'Zeitraum von: (*)',
      rangeEnd: 'bis: (*)',
      area: 'Ausbildungsabschnitt / - Abteilung: (*)',
      supervisor: 'E-Mail des Betreuers: (*)',
      supervisorRepeat: 'E-Mail des Betreuers (Wiederholung): (*)',
    },
    sections: {
      work: 'Betriebliche Tätigkeiten:',
      training:
        'Unterweisungen, betrieblicher Unterricht, sonstige Schulungen:',
      school: 'Berufsschule (Unterrichtsthemen):',
    },
  },
  sendWeeklyReport: {
    title: 'Wochenbericht senden',
    description:
      'Die Anwendung versendet nichts automatisch. Du prüfst den Nachweis, kopierst die Inhalte manuell und markierst danach selbst, dass du gesendet hast.',
    action: 'Gesendet',
    cancelAction: 'Abbrechen',
    openIhk: 'IHK-Seite öffnen',
    copyAction: 'Kopieren',
    selectorTitle: 'Gewählte Woche',
    selectorDescription:
      'Die Auswahl ist nur für die Bildschirmansicht sichtbar und wird nicht in den Nachweis übernommen.',
    selectorLabel: 'Woche',
    selectorPlaceholder: 'Bitte vollständige Woche auswählen',
    completeWeeksTitle: 'Nur vollständige Wochen',
    completeWeeksDescription:
      'Senden ist nur möglich, wenn für alle sieben Tage der Woche Tagesberichte vorhanden sind.',
    completeWeeksDescriptionMissingIhk:
      'Senden ist nur manuell vorgesehen. Hinterlege zusätzlich einen IHK-Link im Onboarding oder in den Settings, damit du die Zielseite direkt öffnen kannst.',
    submittedTitle: 'Wochenbericht bereits gesendet',
    submittedDescription: 'Diese Woche wurde bereits als gesendet markiert.',
    submittedDescriptionWithEmail:
      'Diese Woche wurde bereits als gesendet markiert: {{email}}',
    emptyTitle: 'Keine Wochenvorschau verfügbar',
    emptyDescription: 'Bitte zuerst eine vollständige Woche auswählen.',
    noCompleteWeeks:
      'Aktuell gibt es keine vollständige Woche, die gesendet werden kann.',
    feedback: {
      selectWeekFirst: 'Bitte zuerst eine vollständige Woche auswählen.',
      submitted: 'Wochenbericht wurde als gesendet markiert.',
      submitError: 'Wochenbericht konnte nicht als gesendet markiert werden.',
      copied: 'Inhalt wurde kopiert.',
      copyError: 'Inhalt konnte nicht kopiert werden.',
    },
    leaveDialog: {
      title: 'Wurde der Wochenbericht gesendet?',
      description:
        'Du hast die Sendeseite verlassen, ohne Gesendet oder Abbrechen zu wählen. Möchtest du den Bericht als gesendet markieren?',
      sent: 'Gesendet',
      notSent: 'Nicht gesendet',
      stay: 'Zurück',
    },
  },
  weeklyPdf: {
    title: 'Wochenbericht PDF',
    description:
      'Digitale A4-Vorschau des Ausbildungsnachweises mit Export als PDF-Datei.',
    export: 'Als PDF exportieren',
    selectorTitle: 'Gewählte Woche',
    selectorDescription:
      'Die Auswahl ist nur für die Bildschirmansicht sichtbar und erscheint nicht im PDF.',
    selectorLabel: 'Woche',
    selectorPlaceholder: 'Bitte vollständige Woche auswählen',
    completeWeeksTitle: 'Nur vollständige Wochen',
    completeWeeksDescription:
      'Export ist nur möglich, wenn für alle sieben Tage der Woche Tagesberichte vorhanden sind.',
    emptyTitle: 'Keine PDF-Vorschau verfügbar',
    empty: 'Bitte zuerst eine vollständige Woche auswählen.',
    noCompleteWeeks:
      'Aktuell gibt es keine vollständige Woche, die als PDF exportiert werden kann.',
    feedback: {
      selectWeekFirst: 'Bitte zuerst eine vollständige Woche auswählen.',
      exportCanceled: 'PDF-Export abgebrochen.',
      exported: 'PDF wurde exportiert.',
      exportError: 'PDF-Export fehlgeschlagen.',
    },
  },
  reportsOverview: {
    title: 'Berichte Übersicht',
    description: 'Scrollbare Übersicht aller vorhandenen Tagesdaten.',
    filters: {
      title: 'Filter',
      searchPlaceholder: 'Suche nach Datum, Inhalten oder Freitext',
      allTypes: 'Alle Tagestypen',
    },
    table: {
      date: 'Datum',
      dayType: 'Typ',
      entries: 'Einträge',
      conflict: 'Konflikt',
      weekdays: {
        monday: 'Mo.',
        tuesday: 'Di.',
        wednesday: 'Mi.',
        thursday: 'Do.',
        friday: 'Fr.',
        saturday: 'Sa.',
        sunday: 'So.',
      },
      submitted: 'Gesendet',
      submittedTo: 'Empfänger',
      area: 'Abteilung',
      openDailyTooltip: 'Tagesbericht vom {{date}} öffnen',
      openWeeklyTooltip: 'Wochenbericht {{start}} bis {{end}} öffnen',
    },
  },
  import: {
    title: 'Import',
    description: 'Settings und Berichte sicher importieren.',
    tabs: {
      reports: 'Berichte',
      settings: 'Settings',
    },
    actions: {
      cancel: 'Abbrechen',
      apply: 'Übernehmen',
    },
    reports: {
      title: 'Berichte importieren',
      description: 'Berichte als JSON laden oder aus Google Drive auswählen.',
      localFile: 'Lokale JSON-Datei wählen',
      loadDrive: 'Drive-Backups laden',
      useDriveFile: 'Backup verwenden',
      compareTitle: 'Berichte Vergleich',
      conflictSummary:
        '{{weeks}} Konflikt-Wochen, {{days}} konfliktbehaftete Tagesberichte',
      currentWeek: 'Lokal',
      incomingWeek: 'Importiert',
      strategies: {
        backup: 'Importiert',
        local: 'Lokal',
        latestTimestamp: 'Neuester Timestamp',
      },
    },
    settings: {
      title: 'Settings importieren',
      description: 'Settings JSON laden und vergleichen.',
      chooseFile: 'Settings-Datei wählen',
      compareTitle: 'Settings Vergleich',
      current: 'Lokal',
      incoming: 'Importiert',
    },
    feedback: {
      openFileCanceled: 'Dateiauswahl abgebrochen.',
      settingsPrepared: 'Settings-Import vorbereitet.',
      settingsPrepareError: 'Settings-Import konnte nicht vorbereitet werden.',
      settingsApplied: 'Settings importiert.',
      settingsApplyError: 'Settings-Import fehlgeschlagen.',
      reportsPrepared: 'Berichte-Import vorbereitet.',
      reportsPrepareError: 'Berichte-Import konnte nicht vorbereitet werden.',
      reportsApplied: 'Berichte importiert.',
      reportsApplyError: 'Berichte-Import fehlgeschlagen.',
      driveLoaded: 'Drive-Backups geladen.',
      driveError: 'Drive-Import fehlgeschlagen.',
    },
  },
  export: {
    title: 'Export',
    description:
      'Berichte und Settings lokal oder in Google Drive exportieren.',
    local: {
      title: 'Lokaler Export',
      description: 'JSON-Dateien werden per Dateidialog lokal gespeichert.',
      reports: 'Berichte JSON exportieren',
      settings: 'Settings JSON exportieren',
    },
    drive: {
      title: 'Google Drive Export',
      description: 'Backup direkt in Google Drive hochladen.',
      ready: 'Drive bereit',
      notReady: 'Drive nicht bereit',
      warningTitle: 'Voraussetzungen fehlen',
      warningDescription:
        'Google-Konto oder Drive-Rechte fehlen. Bitte verknüpfen und Berechtigungen erteilen.',
      oauthUnavailable: 'Google OAuth ist nicht konfiguriert.',
      connectedAccount: 'Verknüpftes Konto: {{email}}',
      changeAccountLink: 'Google Drive-Konto wechseln',
      connect: 'Drive verbinden',
      export: 'Backup zu Drive',
    },
    feedback: {
      exportCanceled: 'Export abgebrochen.',
      reportsExported: 'Berichte exportiert.',
      reportsExportError: 'Berichte konnten nicht exportiert werden.',
      settingsExported: 'Settings exportiert.',
      settingsExportError: 'Settings konnten nicht exportiert werden.',
      driveConnected: 'Drive-Verbindung aktualisiert.',
      driveExported: 'Backup nach Drive hochgeladen.',
      driveError: 'Drive-Export fehlgeschlagen.',
    },
  },
} as const;

export default deTranslation;
