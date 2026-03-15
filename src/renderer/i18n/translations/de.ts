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
    remove: 'Entfernen',
    yes: 'Ja',
    no: 'Nein',
    password: {
      show: 'Passwort anzeigen',
      hide: 'Passwort ausblenden',
    },
    errors: {
      unknown: 'Unbekannter Fehler.',
    },
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
          'Beim Verbinden wird der Browser geöffnet. Danach kehrst du automatisch zurück.',
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
      title: 'Dein Berichtsheft',
      description:
        'Erfasse Tages- und Wochenberichte strukturiert und springe direkt in die Bereiche, die du gerade brauchst.',
    },
    stats: {
      dailyReports: 'Tagesberichte',
      weeklyReports: 'Wochenberichte',
      totalEntries: 'Gesamteinträge',
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
        description: 'Alle Einträge durchsuchen, filtern und vergleichen.',
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
    sync: {
      title: 'Feiertage und Ferien',
      description:
        'Beim ersten Anmelden oder am 1. Januar automatisch synchronisiert. Zusätzlich jederzeit manuell synchronisierbar.',
      stateLabel: 'Bundesland',
      syncedAt: 'Letzte Synchronisierung',
      lastError: 'Letzter Fehler',
      currentYear: 'Datenjahr',
      trigger: 'Jetzt synchronisieren',
      missingRegion:
        'Kein Bundesland im Onboarding hinterlegt. Bitte Onboarding abschließen.',
    },
    manual: {
      title: 'Manuelle Abwesenheiten',
      description: 'Krankheit, Urlaub sowie manuelle Ferien/Feiertage.',
      startDate: 'Von',
      endDate: 'Bis',
      type: 'Typ',
      label: 'Bezeichnung',
      note: 'Notiz',
      add: 'Eintrag speichern',
      update: 'Eintrag aktualisieren',
      cancelEdit: 'Bearbeitung abbrechen',
      empty: 'Keine manuellen Abwesenheiten vorhanden.',
      edit: 'Bearbeiten',
      delete: 'Löschen',
      types: {
        sick: 'Krankheit',
        vacation: 'Urlaub',
        publicHoliday: 'Feiertag',
        schoolHoliday: 'Ferien',
      },
    },
    catalog: {
      publicTitle: 'Feiertage',
      schoolTitle: 'Ferien',
      empty: 'Keine Daten verfügbar.',
    },
    feedback: {
      missingDate: 'Bitte gültige Datumswerte angeben.',
      invalidRange: 'Das Enddatum muss am oder nach dem Startdatum liegen.',
      saved: 'Abwesenheiten gespeichert.',
      saveError: 'Abwesenheiten konnten nicht gespeichert werden.',
      deleted: 'Eintrag gelöscht.',
      syncSuccess: 'Abwesenheitsdaten synchronisiert.',
      syncError: 'Abwesenheitsdaten konnten nicht synchronisiert werden.',
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
      connect: 'Google verbinden',
      switch: 'Google wechseln',
      remove: 'Google entfernen',
    },
    confirm: {
      cancel: 'Abbrechen',
      password: {
        title: 'Passwort wirklich ändern?',
        description:
          'Möchtest du das lokale Passwort jetzt wirklich ändern?',
        confirm: 'Passwort ändern',
      },
      googleRemove: {
        title: 'Google-Konto wirklich entfernen?',
        description:
          'Möchtest du die Google-Verknüpfung wirklich entfernen?',
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
    save: 'Settings speichern',
    loadingTitle: 'Settings werden geladen',
    loadingDescription: 'Die aktuellen Einstellungen werden abgerufen.',
    general: {
      title: 'Allgemein',
      description: 'Standardwerte für Berichte und Betreuung.',
      department: 'Ausbildungsabschnitt/Abteilung',
      supervisorPrimary: 'Betreuer-E-Mail',
      supervisorSecondary: 'Betreuer-E-Mail 2',
      ihkLink: 'IHK-Link',
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
    save: 'Stundenplan speichern',
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
    },
    feedback: {
      saved: 'Stundenplan gespeichert.',
      saveError: 'Stundenplan konnte nicht gespeichert werden.',
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
      title: 'Datum und Tagestyp',
      description: 'Datum und Tagestyp festlegen.',
      weekStart: 'Wochenstart',
      weekEnd: 'Wochenende',
      date: 'Datum',
      dayType: 'Tagestyp',
    },
    auto: {
      reasonPublicHoliday: 'Automatisch erkannt: Feiertag ({{name}}).',
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
      description: 'Suchbare Eintragsliste mit wiederverwendbaren Vorschlägen.',
      placeholder: 'Tätigkeit eintragen',
    },
    school: {
      title: 'Schulstunden',
      description: 'Fach/Lehrer pro Stunde und Unterrichtsthema.',
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
      delete: 'Tagesbericht löschen',
    },
    feedback: {
      missingDates: 'Bitte ein gültiges Datum angeben.',
      duplicateActivityForDate:
        'Diese Tätigkeit ist für den {{date}} schon eingetragen.',
      saved: 'Tagesbericht gespeichert.',
      deleted: 'Tagesbericht gelöscht.',
      saveError: 'Tagesbericht konnte nicht gespeichert werden.',
    },
  },
  weeklyReport: {
    title: 'Wochenbericht',
    description: 'Aggregierte Wocheninhalte aus Tagesberichten und Metadaten.',
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
      work: 'Betriebliche Tätigkeiten',
      training:
        'Unterweisungen / betrieblicher Unterricht / sonstige Schulungen',
      school: 'Berufsschule (Unterrichtsthemen)',
    },
    actions: {
      reset: 'Zurücksetzen',
      save: 'Wochenbericht speichern',
      send: 'Wochenbericht senden',
      exportPdf: 'Als PDF exportieren',
    },
    feedback: {
      missingRange: 'Es ist keine gültige Woche ausgewählt.',
      saved: 'Wochenbericht gespeichert.',
      saveError: 'Wochenbericht konnte nicht gespeichert werden.',
    },
  },
  weeklyPdf: {
    title: 'Wochenbericht PDF',
    description: 'Einseitige Vorschau und Export als PDF-Datei.',
    export: 'Als PDF exportieren',
    selectorTitle: 'Woche auswählen',
    selectorDescription: 'Woche auswählen, die als PDF angezeigt wird.',
    previewTitle: 'PDF-Vorschau',
    empty: 'Bitte zunächst eine vorhandene Woche auswählen.',
    labels: {
      week: 'Woche',
      area: 'Abteilung',
      supervisor: 'Betreuer',
      supervisorSecondary: 'Betreuer 2',
    },
    sections: {
      work: 'Betriebliche Tätigkeiten',
      school: 'Berufsschule',
      training:
        'Unterweisungen / betrieblicher Unterricht / sonstige Schulungen',
    },
    feedback: {
      selectWeekFirst: 'Bitte zuerst eine gültige Woche auswählen.',
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
      title: 'Tagesliste',
      date: 'Datum',
      dayType: 'Typ',
      entries: 'Einträge',
      submitted: 'Gesendet',
      submittedTo: 'Empfänger',
      area: 'Abteilung',
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
      changeAccountLink: 'Google-Konto wechseln',
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
