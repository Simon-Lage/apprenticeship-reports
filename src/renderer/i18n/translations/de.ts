const deTranslation = {
  appState: {
    bridgeMissingTitle: 'Electron Bridge nicht verfügbar',
    bridgeMissingDescription:
      'Die Anwendung kann ohne Renderer-Bridge keine Daten laden.',
    loadingTitle: 'Anwendung wird geladen',
    loadingDescription: 'Daten und Einstellungen werden vorbereitet.',
    errorTitle: 'Bootstrap-Fehler',
    retry: 'Erneut laden',
    drivePermissionsTitle: 'Google-Drive-Berechtigung erforderlich',
    drivePermissionsDescription:
      'Die App ist gesperrt, bis die notwendigen Google-Drive-Rechte erteilt wurden.',
    drivePermissionsAction: 'Google Drive verbinden',
    drivePermissionsFallbackDescription:
      'Die Berechtigung wird für regelmäßige Backups der lokalen Datenbank benötigt.',
    drivePermissionsManualLink: 'Berechtigungslink öffnen',
    drivePermissionsManualLinkHint:
      'Falls sich das Browserfenster nicht automatisch öffnet, erscheint hier der Berechtigungslink.',
    drivePermissionsRemoveGoogle: 'Google-Konto entfernen',
    drivePermissionsUnavailable:
      'Google OAuth ist nicht konfiguriert. Ohne OAuth kann die Drive-Freigabe nicht erteilt werden.',
    appLockedTitle: 'App ist gesperrt',
    appLockedDescription:
      'Die Anwendung ist aktuell blockiert. Die folgenden Punkte müssen behoben werden.',
    lockReasons: {
      authentication: 'Anmeldung erforderlich',
      'password-setup': 'Lokales Passwort muss eingerichtet werden',
      'drive-permissions': 'Google-Drive-Berechtigungen fehlen',
      onboarding: 'Pflicht-Onboarding ist unvollständig',
    },
  },
  common: {
    loading: 'Lädt...',
    add: 'Hinzufügen',
    edit: 'Bearbeiten',
    remove: 'Entfernen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    export: 'Exportieren',
    yes: 'Ja',
    no: 'Nein',
    understood: 'Verstanden',
    doNotShowAgain: 'Nicht mehr anzeigen',
    unsavedChanges: {
      title: 'Ungespeicherte Änderungen',
      description:
        'Es gibt ungespeicherte Änderungen. Vor dem Verlassen speichern?',
      save: 'Speichern',
      discard: 'Verwerfen',
      cancel: 'Abbrechen',
    },
    password: {
      show: 'Passwort anzeigen',
      hide: 'Passwort ausblenden',
    },
    googleAuth: {
      manualLink:
        'Hier klicken, falls sich das Fenster im Browser nicht automatisch öffnet.',
      cancel: 'Google-Anmeldung abbrechen',
    },
    disabledReasons: {
      pending: 'Aktion läuft bereits.',
      loading: 'Daten werden geladen.',
      noChanges: 'Keine Änderungen vorhanden.',
      submittedReport: 'Bericht wurde bereits gesendet.',
      missingWeek: 'Keine gültige Woche ausgewählt.',
      incompleteWeek: 'Woche ist noch nicht vollständig.',
      incompleteWeekPdf:
        'PDF-Export ist nur für vollständig eingetragene Wochen möglich.',
      incompleteWeekSend:
        'Senden ist nur für vollständig eingetragene Wochen möglich.',
      futureWeekSend:
        'Wochenberichte können erst nach Ende der Woche gesendet werden.',
      sendOrderBlocked:
        'Der älteste ungesendete Wochenbericht muss zuerst gesendet werden.',
      noCompleteWeeks: 'Keine vollständige Woche verfügbar.',
      noSelectedWeek: 'Keine Woche ausgewählt.',
      missingPreview: 'Vorschau ist nicht verfügbar.',
      missingIhkLink: 'Kein IHK-Link hinterlegt.',
      googleOauthUnavailable: 'Google OAuth ist nicht konfiguriert.',
      googleAccountMissing: 'Kein Google-Konto verknüpft.',
      driveNotReady: 'Google Drive ist nicht bereit.',
      runtimeUnavailable: 'Anwendungsschnittstelle ist nicht verfügbar.',
      missingSubdivision: 'Kein Bundesland hinterlegt.',
      deletionPending: 'Löschvorgang läuft bereits.',
      passwordPending: 'Passwort-Aktion läuft bereits.',
      googlePending: 'Google-Aktion läuft bereits.',
      stepNotSelectable: 'Dieser Schritt ist noch nicht erreichbar.',
    },
    submittedReport: {
      label: 'Bereits gesendet',
      tooltip:
        'Kann nicht angepasst werden, da der Eintrag bereits an die IHK gemeldet wurde.',
    },
    aria: {
      breadcrumb: 'Breadcrumb',
      more: 'Mehr',
      previousDay: 'Vorheriger Tag',
      nextDay: 'Nächster Tag',
      previousWeek: 'Vorherige Woche',
      nextWeek: 'Nächste Woche',
      previousSlide: 'Vorherige Folie',
      nextSlide: 'Nächste Folie',
      close: 'Schließen',
    },
    demo: {
      selectFramework: 'Framework auswählen...',
      searchFramework: 'Framework suchen...',
      noFrameworkFound: 'Kein Framework gefunden.',
      pickDate: 'Datum auswählen',
    },
    errors: {
      unknown: 'Unbekannter Fehler.',
    },
  },
  driveActionErrors: {
    storageQuota: {
      title: 'Google-Drive-Speicher voll',
      description:
        'Der Export konnte nicht gespeichert werden, weil in Google Drive kein ausreichender Speicherplatz verfügbar ist. Speicherplatz kann in Google Drive geprüft und freigegeben werden.',
      action: 'Drive-Speicher öffnen',
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
      'Diese Woche ist noch nicht als gesendet markiert. Die betroffenen Tage sollten vor einer Anpassung von Tagesbericht oder Abwesenheiten geprüft werden.',
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
    logoutConfirmDescription:
      'Soll die Abmeldung wirklich durchgeführt werden?',
    logoutError: 'Ausloggen fehlgeschlagen.',
  },
  windowMode: {
    switchToFullscreen: 'In Vollbild wechseln',
    switchToWindowed: 'In Fenstermodus wechseln',
  },
  mainDialogs: {
    updateReady: {
      title: 'Update bereit',
      message: 'Ein Update wurde heruntergeladen.',
      detail:
        'Jetzt neu starten und installieren? Bei Auswahl von Später wird das Update automatisch beim Beenden installiert.',
      installNow: 'Jetzt installieren',
      later: 'Später',
    },
    closeWithUnsavedChanges: {
      title: 'Ungespeicherte Änderungen',
      message: 'Es gibt ungespeicherte Änderungen.',
      detail:
        'Das Programm wirklich beenden? Alle ungespeicherten Änderungen gehen verloren.',
      quitAnyway: 'Trotzdem beenden',
      cancel: 'Abbrechen',
    },
  },
  releaseNotes: {
    title: 'Neu in Version {{version}}',
    description: 'Diese Änderungen wurden mit dem letzten Update installiert.',
    fallback:
      'Die Anwendung wurde von Version {{previousVersion}} auf {{version}} aktualisiert.',
  },
  login: {
    title: 'Anmeldung',
    passwordLabel: 'Passwort',
    rememberMe: 'Angemeldet bleiben',
    passwordSubmit: 'Mit Passwort anmelden',
    googleTitle: 'Google-Anmeldung',
    googleSubmit: 'Mit Google anmelden',
    googleDisabledHint: 'Es wurde noch kein Google-Konto hinterlegt.',
    googleUnavailableHint: 'Google OAuth ist nicht konfiguriert.',
    validation: {
      passwordRequired: 'Passwort erforderlich.',
    },
    feedback: {
      passwordSuccess: 'Passwort-Anmeldung erfolgreich.',
      passwordError: 'Passwort-Anmeldung fehlgeschlagen.',
      passwordInvalid: 'Das Passwort ist nicht korrekt.',
      googleSuccess: 'Google-Anmeldung erfolgreich.',
      googleError: 'Google-Anmeldung fehlgeschlagen.',
      googleAccountMismatch:
        'Das ausgewählte Google-Konto passt nicht zur hinterlegten Anmeldung.',
    },
  },
  onboarding: {
    welcome: {
      kicker: 'AppRep',
      title: 'Willkommen bei AppRep',
      description:
        'Diese Anwendung unterstützt strukturierte Tages- und Wochenberichte, Export und sichere Backups.',
      start: 'Los geht’s',
      features: {
        dailyTitle: 'Tagesberichte',
        dailyDescription:
          'Jeden Tag präzise mit Tätigkeiten, Schulthemen und Schulungen dokumentieren.',
        weeklyTitle: 'Wochenberichte',
        weeklyDescription:
          'Vollständige Wochenberichte mit klarer Struktur und PDF-Ausgabe erstellen.',
        syncTitle: 'Import & Export',
        syncDescription:
          'JSON-Import/Export und sichere Datenflüsse mit Vergleichsansicht nutzen.',
        setupTitle: 'Sicherer Start',
        setupDescription:
          'Im nächsten Schritt wird das verpflichtende lokale Passwort eingerichtet.',
      },
    },
    password: {
      title: 'Passwort festlegen',
      passwordLabel: 'Passwort festlegen',
      confirmLabel: 'Passwort wiederholen',
      submit: 'Passwort speichern',
      requirementsTitle: 'Passwort-Anforderungen',
      validationRules: 'Alle Passwort-Anforderungen müssen erfüllt sein.',
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
      generic: 'Eingaben prüfen.',
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
          'Dieser Schritt kann übersprungen werden. Ein Google-Konto kann später in den Einstellungen verknüpft werden.',
        unavailableTitle: 'Google derzeit nicht verfügbar',
        unavailableDescription:
          'Google OAuth ist in dieser Umgebung nicht konfiguriert. Dieser optionale Schritt kann übersprungen werden.',
        browserHint:
          'Beim Verbinden wird das Auth-Fenster im Browser geöffnet. Nach erfolgreicher Anmeldung muss dieses Fenster geschlossen werden.',
        connectedTitle: 'Google-Konto verknüpft',
        connectedDescription:
          'Ein Google-Konto wurde erfolgreich mit der App verknüpft.',
        connectedDescriptionWithEmail:
          'Ein Google-Konto wurde erfolgreich verknüpft: {{email}}',
        connect: 'Google verbinden',
        switchAccount: 'Account wechseln',
        validationEmail: 'Gültige E-Mail erforderlich.',
      },
      'company-logo': {
        title: 'Firmenlogo',
        description:
          'Optionales Firmenlogo für den PDF-Export der Ausbildungsberichte.',
        optionalTitle: 'Optionaler Schritt',
        optionalDescription:
          'Optional kann ein Firmenlogo hochgeladen werden. Das Logo erscheint im PDF-Export der Ausbildungsberichte. Erlaubt ist nur eine PNG-Datei mit transparentem Hintergrund.',
        empty: 'Kein Firmenlogo hinterlegt.',
        previewText: 'Firmenlogo für den PDF-Export hinterlegt.',
        previewAlt: 'Firmenlogo Vorschau',
        upload: 'Datei hochladen',
        change: 'Datei ändern',
        remove: 'Datei entfernen',
        errors: {
          invalidType:
            'Nur PNG-Dateien mit transparentem Hintergrund sind erlaubt.',
          tooLarge: 'Die PNG-Datei ist zu groß.',
          notTransparent:
            'Die PNG-Datei muss einen transparenten Hintergrund haben.',
          unreadable: 'Die Datei konnte nicht gelesen werden.',
        },
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
        title: 'Feiertage und Ferien',
        description:
          'Bundesland für Feiertage und Ferien sowie automatische Synchronisierung auswählen.',
        subdivisionCode: 'Bundesland',
        placeholder: 'Bundesland auswählen',
        autoSyncHolidays: 'Feiertage und Ferien automatisch synchronisieren',
        openHolidaysNoticeBefore: 'Optionaler Abruf über die ',
        openHolidaysLink: 'OpenHolidays API',
        openHolidaysNoticeAfter:
          '. Der Abruf startet erst nach dieser Auswahl.',
        validationSubdivision: 'Gültiges Bundesland erforderlich.',
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
          'Legt fest, ab welchem Datum Berichte in dieser App geführt werden. Sinnvoll, wenn die Ausbildung früher begonnen hat oder bereits Berichte außerhalb dieses Tools existieren.',
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
        validationDepartmentRequired: 'Abteilung erforderlich.',
        validationTrainerEmailRequired: 'Betreuer-E-Mail erforderlich.',
        validationEmail: 'Gültige E-Mail erforderlich.',
        validationUrl: 'Gültige URL erforderlich.',
      },
    },
  },
  home: {
    hero: {
      kicker: 'AppRep',
      title: 'Apprenticeship Reporting',
      titleParts: {
        app: 'App',
        apprenticeshipRest: 'renticeship',
        rep: 'Rep',
        reportingRest: 'orting',
      },
      description: 'Ausbildungsberichte erfassen und strukturiert ausgeben!',
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
        'Rückstand beim Schreiben der Tagesberichte: {{count}} Tage.',
      sameDayRate: 'Am selben Tag',
      sameDayRateDescription:
        'Anteil der Tagesberichte, die direkt am passenden Datum erfasst wurden.',
      averageBatchSize: 'Pro Erfassungstag',
      averageBatchSizeDescription:
        'Durchschnittlich werden {{average}} Berichte an einem Tag geschrieben. Bei täglicher Erfassung liegt der Wert bei 1,0. <sameDayRate>{{sameDayRate}}</sameDayRate> wurden am gleichen Tag erstellt.',
      entryModes: 'Manuell / Automatisch',
      entryModesValue: '{{manual}} / {{automatic}}',
      entryModesDescription:
        'Insgesamt {{total}} Tagesberichte: {{manual}} manuell erstellt, {{automatic}} automatisch durch AppRep angelegt.',
      weeklyReportsToSend: 'Wochenberichte zu senden',
      weeklyReportsToSendDescription:
        'Von {{total}} Wochenberichten sind {{submitted}} gesendet.',
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
        description: 'Wocheninhalte sammeln und als Bericht erstellen.',
      },
      overview: {
        title: 'Berichte Übersicht',
        description: 'Berichte filtern und verwalten.',
      },
      timetable: {
        title: 'Stundenplan',
        description: 'Schulfächer und zugewiesene Lehrer verwalten.',
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
        description: 'Krankheit, Urlaub sowie Feiertage und Ferien verwalten.',
      },
    },
    footer: {
      version: 'Version {{version}}',
      github: 'GitHub',
      checkUpdates: 'Nach Updates prüfen',
      lastUpdated: 'Zuletzt aktualisiert: {{date}}',
      unknownDate: 'unbekannt',
      feedback: {
        loadError: 'Build-Informationen konnten nicht geladen werden.',
        updateFound: 'Update gefunden.',
        updatePreparing: 'Update wird vorbereitet.',
        updateCheckNotAvailable: 'Kein Update verfügbar.',
        updateCheckUnavailable: 'Update-Dienst ist aktuell nicht bereit.',
        updateCheckUnavailableInDev:
          'Update-Prüfung ist im Entwicklungs-/Testmodus nicht verfügbar.',
        updateCheckRetryLater:
          'Update-Prüfung fehlgeschlagen. Bitte später erneut versuchen.',
        updateCheckError: 'Update-Prüfung fehlgeschlagen.',
      },
    },
  },
  absences: {
    title: 'Abwesenheiten',
    description:
      'Manuelle Abwesenheiten und automatisch importierte Feiertage/Ferien verwalten.',
    intro: {
      title: 'Abwesenheiten verwalten',
      description:
        'Hier werden Krankheit, Urlaub, Feiertage und Ferien für die Berichtserstellung gepflegt.',
      sync: 'Feiertage und Ferien können automatisch über das Bundesland synchronisiert werden. Fehlende Jahre werden bei aktivierter Automatik nachgeladen.',
      manual:
        'Krankheit, Urlaub und eigene Feiertage oder Ferien können manuell erfasst und später bearbeitet werden.',
      locked:
        'Bereits gesendete Wochenberichte schützen ältere Zeiträume vor nachträglichen Änderungen.',
    },
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
      currentYear: 'Aktuelles Jahr',
      catalogYears: 'Vorhandene Jahre',
      requiredYears: 'Benötigte Jahre',
      autoSyncSetting: 'Automatische Synchronisierung',
      trigger: 'Jetzt synchronisieren',
      missingRegion:
        'Kein Bundesland im Onboarding hinterlegt. Onboarding muss abgeschlossen werden.',
      missingYearsTitle: 'Fehlende Jahresdaten',
      missingYearsDescription:
        'Für {{years}} fehlen lokale Feiertags- und Ferienkataloge. Die Daten werden automatisch nachgeladen.',
      missingYearsAutoSyncDisabledDescription:
        'Für {{years}} fehlen lokale Feiertags- und Ferienkataloge. Automatische Synchronisierung ist deaktiviert. Manuelle Synchronisierung oder Aktivierung von Auto-Sync erforderlich.',
      autoSyncDisabledHint:
        'Automatische Importe für {{years}} sind verfügbar, aktuell aber deaktiviert.',
      confirmTitle: 'Feiertage und Ferien synchronisieren?',
      confirmDescription:
        'Feiertage und Ferien jetzt synchronisieren? Dafür wird eine Verbindung zur OpenHolidays API hergestellt und die betroffenen Jahreskataloge werden aktualisiert. Bereits vorhandene andere Jahre bleiben erhalten.',
      syncNowConfirmTitle: 'Jetzt synchronisieren?',
      syncNowConfirmDescription:
        'Feiertage und Ferien jetzt synchronisieren? Dafür wird eine Verbindung zur OpenHolidays API hergestellt und die betroffenen Jahreskataloge werden aktualisiert. Bereits vorhandene andere Jahre bleiben erhalten.',
      warningTitle: 'Externer Abruf und Überschreiben',
      warningDescription:
        'Die Synchronisation aktualisiert nur die betroffenen Jahreskataloge mit Daten der OpenHolidays API. Andere Jahre bleiben unverändert erhalten.',
      autoSyncLabel: 'Zukünftig automatisch synchronisieren',
      enableAutoSyncLabel: 'Automatische Synchronisierung wieder aktivieren',
      confirmButton: 'Jetzt synchronisieren',
      dismissButton: 'Vorerst nicht',
    },
    manual: {
      title: 'Manuelle Abwesenheiten',
      description: 'Krankheit, Urlaub sowie manuelle Ferien/Feiertage.',
      summary: 'Krankheit/Urlaub',
      startDate: 'Von',
      endDate: 'Bis',
      copyStartDateToEndDate: 'Startdatum als Enddatum übernehmen',
      copyEndDateToStartDate: 'Enddatum als Startdatum übernehmen',
      type: 'Typ',
      label: 'Bezeichnung',
      note: 'Notiz',
      add: 'Eintrag speichern',
      update: 'Aktualisieren',
      cancelEdit: 'Abbrechen',
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
      description: 'Synchronisierte und manuelle Feiertage/Ferien verwalten.',
      summary: 'Feiertage/Ferien',
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
      missingDate: 'Gültige Datumswerte erforderlich.',
      invalidRange: 'Das Enddatum muss am oder nach dem Startdatum liegen.',
      labelRequiredForHolidayType:
        'Für Feiertage und Ferien ist eine Bezeichnung erforderlich.',
      saved: 'Abwesenheiten gespeichert.',
      saveError: 'Abwesenheiten konnten nicht gespeichert werden.',
      deleted: 'Eintrag gelöscht.',
      submittedReportLocked:
        'Manuelle Änderungen sind erst ab {{date}} möglich, da vorherige Wochenberichte bereits gesendet wurden.',
      syncSuccess: 'Abwesenheitsdaten synchronisiert.',
      syncError: 'Abwesenheitsdaten konnten nicht synchronisiert werden.',
    },
    unsavedChanges: {
      save: 'Abwesenheiten speichern',
      discard: 'Verwerfen',
      cancel: 'Abbrechen',
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
    currentPassword: {
      title: 'Aktuelles Passwort bestätigen',
      googleDescription:
        'Bitte bestätige dein aktuelles Passwort, bevor ein Google-Konto verbunden oder gewechselt wird.',
      passwordDescription:
        'Bitte bestätige dein aktuelles Passwort, bevor du ein neues Passwort speicherst.',
      required: 'Aktuelles Passwort erforderlich.',
      invalid: 'Das aktuelle Passwort ist nicht korrekt.',
      confirm: 'Bestätigen',
    },
    google: {
      title: 'Google (optional)',
      description: 'Google-Konto verbinden, wechseln oder entfernen.',
      notLinked: 'Kein Google-Konto verknüpft',
      unavailable: 'Google OAuth ist nicht konfiguriert.',
      browserHintTitle: 'Wichtiger Hinweis',
      browserHint:
        'Beim Verbinden wird das Auth-Fenster im Browser geöffnet. Nach erfolgreicher Anmeldung muss dieses Fenster geschlossen werden.',
      connect: 'Google verbinden',
      switch: 'Google wechseln',
      remove: 'Google entfernen',
    },
    confirm: {
      cancel: 'Abbrechen',
      password: {
        title: 'Passwort wirklich ändern?',
        confirm: 'Passwort ändern',
      },
      googleRemove: {
        title: 'Google-Konto wirklich entfernen?',
        description: 'Google-Verknüpfung wirklich entfernen?',
        confirm: 'Google-Konto entfernen',
      },
    },
    feedback: {
      passwordFieldsRequired: 'Beide Passwortfelder müssen ausgefüllt sein.',
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
    ihkExperimental: {
      title: 'Experimentell: IHK OSELGB',
      description:
        'Speichert Wochenberichte zusätzlich im Portal bildung-ihk-oselgb.de.',
      warningTitle: 'Experimentelles Feature',
      warningDescription:
        'Diese Funktion ist nur für das IHK-Portal Osnabrück - Emsland - Grafschaft Bentheim vorgesehen. Das Passwort wird verschlüsselt im lokalen Systemspeicher abgelegt.',
      passwordLabel: 'IHK-Passwort',
      passwordPlaceholder: 'Passwort eingeben',
      passwordConfigured: 'Ein Passwort ist hinterlegt.',
      passwordNotConfigured: 'Noch kein Passwort hinterlegt.',
      savePassword: 'Passwort speichern',
      updatePassword: 'Passwort ändern',
      removePassword: 'Passwort entfernen',
      active: 'Aktiv: IHK-Link und Passwort sind für OSELGB hinterlegt.',
      inactivePassword:
        'Inaktiv: Der IHK-Link passt, aber das Passwort fehlt noch.',
      inactiveLink:
        'Inaktiv: Der hinterlegte IHK-Link gehört nicht zu bildung-ihk-oselgb.de.',
      disabled: {
        passwordMissing: 'Passwort fehlt.',
        secureStorageUnavailable:
          'Der sichere Systemspeicher ist nicht verfügbar.',
      },
      feedback: {
        saved: 'IHK-Passwort gespeichert.',
        saveError: 'IHK-Passwort konnte nicht gespeichert werden.',
        removed: 'IHK-Passwort entfernt.',
        removeError: 'IHK-Passwort konnte nicht entfernt werden.',
      },
    },
    companyLogo: {
      title: 'Firmenlogo',
      notice:
        'Das Firmenlogo erscheint oben rechts im PDF-Export der Ausbildungsberichte. Erlaubt ist nur eine PNG-Datei mit transparentem Hintergrund.',
      empty: 'Kein Firmenlogo hinterlegt.',
      previewAlt: 'Firmenlogo Vorschau',
      upload: 'Datei hochladen',
      change: 'Datei ändern',
      remove: 'Datei entfernen',
      errors: {
        title: 'Firmenlogo konnte nicht übernommen werden.',
        invalid: 'Ungültiges Firmenlogo.',
        invalidType:
          'Nur PNG-Dateien mit transparentem Hintergrund sind erlaubt.',
        tooLarge: 'Die PNG-Datei ist zu groß.',
        notTransparent:
          'Die PNG-Datei muss einen transparenten Hintergrund haben.',
        unreadable: 'Die Datei konnte nicht gelesen werden.',
      },
    },
    trainingPeriod: {
      title: 'Ausbildungszeitraum',
      description:
        'Steuert den Startpunkt für Tages- und Wochenberichte sowie den gültigen Zeitraum.',
      start: 'Ausbildungsbeginn',
      end: 'Ausbildungsende',
      reportsSince: 'Ausbildungsberichte seit (optional)',
      reportsSinceExplanation:
        'Ausbildungsberichte seit legt fest, ab welchem Datum Berichte in dieser App geführt werden. Sinnvoll, wenn die Ausbildung früher begonnen hat oder bereits Berichte außerhalb dieses Tools existieren.',
    },
    region: {
      title: 'Ferien und Feiertage',
      description:
        'Wird für den Import von Feiertagen und Ferien über Open Holidays verwendet.',
      subdivisionCode: 'Bundesland',
      placeholder: 'Bundesland auswählen',
      autoSyncHolidays: 'Automatisch synchronisieren',
      autoSyncDescription:
        'Feiertage und Ferien beim App-Start, beim Regionswechsel und beim Jahreswechsel aktuell halten.',
      openHolidaysNoticeBefore:
        'Die automatische Synchronisierung von Feiertagen und Ferien wird empfohlen, damit freie Tage korrekt erkannt werden. Dafür wird eine Verbindung zur Drittanbieter-API ',
      openHolidaysLink: 'OpenHolidays API',
      openHolidaysNoticeAfter:
        ' hergestellt und der passende Jahreskatalog anhand des Bundeslands geladen.',
    },
    earlyWeeklySubmission: {
      title: 'Wochenberichte vorzeitig senden',
      description:
        'Erlaubt das Senden laufender oder künftiger Wochen, wenn alle noch kommenden Tage automatisch eingetragen wurden.',
      warningTitle: 'Nur in Ausnahmefällen aktivieren',
      warningDescription:
        'Ein vorzeitig gesendeter Wochenbericht wird gesperrt. Änderungen an Urlaub, Feiertagen oder automatisch eingetragenen Tagen sind danach nicht mehr möglich. Die Option sollte normalerweise ausgeschaltet bleiben.',
      allow: 'Vorzeitiges Senden erlauben',
    },
    validation: {
      firstNameRequired: 'Vorname darf nicht leer sein.',
      lastNameRequired: 'Nachname darf nicht leer sein.',
      apprenticeIdentifierRequired: 'Azubi-Identnummer darf nicht leer sein.',
      professionRequired: 'Berufsbezeichnung darf nicht leer sein.',
      trainingStartRequired: 'Ausbildungsbeginn darf nicht leer sein.',
      trainingEndRequired: 'Ausbildungsende darf nicht leer sein.',
      subdivisionRequired: 'Bundesland darf nicht leer sein.',
      departmentRequired:
        'Ausbildungsabschnitt/Abteilung darf nicht leer sein.',
      trainerEmailRequired: 'Betreuer-E-Mail darf nicht leer sein.',
      invalidEmail: 'Ungültige E-Mail.',
    },
    exchange: {
      title: 'Settings Import/Export',
      description: 'Settings als JSON exportieren oder importieren.',
      export: 'Settings exportieren',
      import: 'Settings importieren',
    },
    backup: {
      title: 'Automatische Backups',
      description: 'Automatische Backups und Exporte.',
      reportsEnabled: 'Berichte automatisch backupen',
      reportsDailyThreshold: 'Neues Backup alle x Tagesberichte',
      settingsEnabled: 'Settings automatisch backupen',
      automaticBackupsEncrypted: 'Automatische Backups verschlüsseln',
      automaticBackupsEncryptedDescription:
        'Empfohlen für Backups in Google Drive und lokale Backup-Dateien.',
      scope: {
        onboarding: 'Onboarding-Daten aufnehmen',
        ui: 'Oberflächen-Einstellungen aufnehmen',
        absence: 'Abwesenheiten aufnehmen',
        required: 'Mindestens ein Settings-Bereich bleibt aktiv.',
      },
    },
    compare: {
      title: 'Vergleichsansicht',
      description: 'Vor dem Überschreiben werden Unterschiede angezeigt.',
      cancel: 'Import abbrechen',
      apply: 'Import anwenden',
      diffCount: 'Anzahl Unterschiede',
      currentTitle: 'Aktuelle Settings',
      incomingTitle: 'Zielzustand nach Import',
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
    intro: {
      title: 'Stundenplan einrichten',
      description:
        'Der Stundenplan hilft der App, Schultage und Berichtsvorschläge zuverlässiger vorzubereiten.',
      schedule:
        'Pro Wochentag und Stunde können Fach und Lehrer eingetragen werden, wenn diese Struktur genutzt werden soll.',
      catalogs:
        'Unten auf der Seite können Lehrer und Fächer eingetragen und in den Listen gepflegt werden.',
      optional:
        'Wenn der Stundenplan nicht benötigt wird, kann er leer bleiben und die Tage können weiter manuell gesetzt werden.',
    },
    updateReminder: {
      title: 'Stundenplan prüfen?',
      description:
        'Der Wochenbericht bis zum letzten Sonntag im Juli ({{date}}) ist vollständig eingetragen. Soll der Stundenplan für das neue Schuljahr angepasst werden?',
      dismiss: 'Dieses Jahr nicht mehr',
      later: 'Später erinnern',
      open: 'Stundenplan öffnen',
    },
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
      schoolDayLabel: '{{day}} als Schultag markieren',
      schoolDayTooltip:
        'Markiert diesen Wochentag als Schultag, auch ohne eingetragene Stunden.',
      schoolDayForcedTooltip:
        'Dieser Tag ist wegen vollständiger Stunden automatisch ein Schultag.',
      clearDayLabel: 'Einträge für {{day}} löschen',
      clearDayTooltip: 'Alle Stunden dieses Wochentags löschen.',
    },
    config: {
      title: 'Konfiguration',
      description: 'Lehrer- und Fächerlisten direkt verwalten.',
      summary: 'Lehrer/Fächer',
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
    confirmClearDay: {
      title: 'Einträge für {{day}} löschen?',
      description:
        'Alle Stundenplan-Einträge für {{day}} werden entfernt. Diese Änderung wird erst mit dem Stundenplan gespeichert.',
      cancel: 'Abbrechen',
      confirm: 'Einträge löschen',
    },
    feedback: {
      saved: 'Stundenplan gespeichert.',
      saveError: 'Stundenplan konnte nicht gespeichert werden.',
      teacherRequired: 'Lehrername erforderlich.',
      subjectRequired: 'Fachname erforderlich.',
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
      titleWithDate: '{{date}}',
      description: 'Datum und Tagestyp festlegen.',
      editingDescription: 'Tagesbericht vom {{date}} wird bearbeitet.',
      creatingDescription: 'Ein neuer Tagesbericht für {{date}} wird angelegt.',
      submittedDescription: 'Gesendeter Tagesbericht vom {{date}}.',
      weekStart: 'Wochenstart',
      weekEnd: 'Wochenende',
      date: 'Datum',
      dayType: 'Tagestyp',
    },
    calendar: {
      title: 'Tageskalender',
      description:
        'Tag auswählen und sofort erkennen, welche Berichte schon gesendet, nur gespeichert oder noch offen sind.',
      legendSubmitted: 'Bereits gesendet',
      legendDraft: 'Eingetragen, noch nicht gesendet',
      legendEmpty: 'Noch kein Tagesbericht',
    },
    status: {
      editingTitle: 'Bearbeitungsmodus',
      editingDescription: 'Tagesbericht vom {{date}} wird bearbeitet.',
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
    list: {
      addEntry: 'Eintrag hinzufügen',
      removeEntry: 'Eintrag entfernen',
    },
    suggestions: {
      edit: 'Vorschlag bearbeiten',
      delete: 'Vorschlag entfernen',
      editTitle: 'Vorschlag bearbeiten',
      editDescription:
        'Der Vorschlag wird nur für die Vorschlagsliste geändert.',
      editDescriptionWithReports:
        'Der Vorschlag wird für die Vorschlagsliste geändert. Er kommt außerdem in nicht gesendeten Tagesberichten vor: {{dates}}.',
      updateReports:
        'Diesen Wert auch in den genannten nicht gesendeten Tagesberichten ersetzen.',
      deleteTitle: 'Vorschlag entfernen?',
      deleteDescription:
        '"{{value}}" wird aus der Vorschlagsliste ausgeblendet. Wenn der Wert später wieder in einem Tagesbericht gespeichert wird, erscheint er erneut.',
      deleteConfirm: 'Vorschlag entfernen',
      saved: 'Vorschlag gespeichert.',
      deleted: 'Vorschlag entfernt.',
      saveError: 'Vorschlag konnte nicht gespeichert werden.',
      valueRequired: 'Vorschlag darf nicht leer sein.',
    },
    school: {
      title: 'Schultätigkeiten',
      addLesson: 'Stunde hinzufügen',
      lessonNumberOption: 'Stunde {{lesson}}',
      lessonLabel: '{{lesson}}. Stunde',
      freeLesson: 'Freistunde',
      doubleLesson: 'Doppelstunde',
      showTopics: 'Nach Themen',
      showLessons: 'Nach Stunden',
      showTopicsTooltip:
        'Hier können die Themen unabhängig von Lehrer und Fach für den Tag eingetragen werden.',
      showLessonsTooltip:
        'Hier können die Themen für die einzelnen Stunden mit Fach und Lehrer eingetragen werden.',
      subjectPlaceholder: 'Fach',
      teacherPlaceholder: 'Lehrer',
      topicPlaceholder: 'Thema',
      removeLesson: 'Stunde entfernen',
      dragLesson: 'Stunde verschieben',
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
      resetChanges: 'Änderungen zurücksetzen',
      delete: 'Tagesbericht löschen',
    },
    resetDialog: {
      title: 'Änderungen zurücksetzen?',
      description:
        'Alle seit dem letzten Speichern vorgenommenen Änderungen werden verworfen.',
      cancel: 'Zurück',
      confirm: 'Änderungen zurücksetzen',
    },
    deleteDialog: {
      title: 'Tagesbericht löschen?',
      description:
        'Soll der Tagesbericht vom {{date}} wirklich gelöscht werden?',
    },
    feedback: {
      missingDates: 'Gültiges Datum erforderlich.',
      missingFreeReason:
        'Bei freien Tagen muss ein genauer Grund eingetragen werden.',
      missingWorkEntries:
        'Bei Arbeitstagen muss mindestens eine Arbeitstätigkeit oder eine Schulung eingetragen werden.',
      missingSchoolLessonTopics:
        'Bei Schultagen muss für jede Schulstunde mindestens ein Thema eingetragen sein.',
      missingSchoolTopics:
        'Bei Schultagen ohne Schulstunden muss mindestens eine Schultätigkeit eingetragen werden.',
      duplicateActivityForDate:
        'Diese Tätigkeit ist für den {{date}} schon eingetragen.',
      saved: 'Tagesbericht gespeichert.',
      deleted: 'Tagesbericht gelöscht.',
      saveError: 'Tagesbericht konnte nicht gespeichert werden.',
    },
    unsavedChanges: {
      save: 'Tagesbericht speichern',
      discard: 'Verwerfen',
      cancel: 'Abbrechen',
    },
  },
  weeklyReport: {
    title: 'Wochenbericht',
    description: 'Aggregierte Wocheninhalte aus Tagesberichten und Metadaten.',
    form: {
      area: 'Ausbildungsabschnitt/Abteilung',
      supervisorEmail: 'Betreuer-E-Mail',
    },
    progress: {
      title: 'Erfassungsstand der Woche',
      dayState: '{{day}}: {{status}}',
      states: {
        automatic: 'Automatisch erfasst',
        manual: 'Manuell erfasst',
        missing: 'Manuell erforderlich',
      },
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
      copy: 'Kopieren',
      reset: 'Zurücksetzen',
      save: 'Wochenbericht speichern',
      send: 'Wochenbericht senden',
      exportPdf: 'Als PDF exportieren',
    },
    sendOrderDialog: {
      title: 'Reihenfolge der Wochenberichte',
      description:
        'Die IHK erwartet Wochenberichte in der richtigen Reihenfolge. Vor dem Senden muss der älteste noch nicht gesendete Wochenbericht geöffnet werden.',
      oldestWeek: 'Ältester ungesendeter Wochenbericht: {{start}} - {{end}}',
      openOldest: 'Ältesten ungesendeten Wochenbericht öffnen',
    },
    notifications: {
      copied: 'Inhalt wurde kopiert.',
      copyFailed: 'Inhalt konnte nicht kopiert werden.',
      saved: 'Wochenbericht wurde gespeichert.',
      saveFailed: 'Wochenbericht konnte nicht gespeichert werden.',
      autoFillFailed: 'Automatisches Ausfüllen der freien Tage fehlgeschlagen.',
    },
    status: {
      submitted: 'Bericht abgeschickt',
      pending: 'Noch nicht abgeschickt',
    },
    feedback: {
      missingRange: 'Es ist keine gültige Woche ausgewählt.',
      saved: 'Wochenbericht gespeichert.',
      saveError: 'Wochenbericht konnte nicht gespeichert werden.',
    },
  },
  weeklyDocument: {
    title: 'Ausbildungsnachweis',
    pageLabel: 'Seite {{page}} von {{total}}',
    emptyValue: '-',
    noDataToCopy: 'Keine Daten zum Kopieren vorhanden',
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
      'Die Anwendung versendet nichts automatisch. Der Nachweis wird geprüft, die Inhalte werden manuell kopiert und der Bericht danach als gesendet markiert.',
    action: 'Gesendet',
    cancelAction: 'Abbrechen',
    openIhk: 'IHK-Seite öffnen',
    copyAction: 'Kopieren',
    selectorTitle: 'Gewählte Woche',
    selectorDescription:
      'Die Auswahl ist nur für die Bildschirmansicht sichtbar und wird nicht in den Nachweis übernommen.',
    selectorLabel: 'Woche',
    selectorPlaceholder: 'Vollständige Woche auswählen',
    completeWeeksTitle: 'Nur vollständige Wochen',
    completeWeeksDescription:
      'Senden ist nur möglich, wenn für alle sieben Tage der Woche Tagesberichte vorhanden sind.',
    completeWeeksDescriptionMissingIhk:
      'Senden ist nur manuell vorgesehen. Zusätzlich ist ein IHK-Link im Onboarding oder in den Settings erforderlich, damit die Zielseite direkt geöffnet werden kann.',
    submittedTitle: 'Wochenbericht bereits gesendet',
    submittedDescription: 'Diese Woche wurde bereits als gesendet markiert.',
    emptyTitle: 'Keine Wochenvorschau verfügbar',
    emptyDescription: 'Zuerst eine vollständige Woche auswählen.',
    noCompleteWeeks:
      'Aktuell gibt es keine vollständige Woche, die gesendet werden kann.',
    feedback: {
      selectWeekFirst: 'Vollständige Woche erforderlich.',
      submitted: 'Wochenbericht wurde als gesendet markiert.',
      submitError: 'Wochenbericht konnte nicht als gesendet markiert werden.',
      copied: 'Inhalt wurde kopiert.',
      copyError: 'Inhalt konnte nicht kopiert werden.',
    },
    leaveDialog: {
      title: 'Wurde der Wochenbericht gesendet?',
      description:
        'Die Sendeseite wurde verlassen, ohne Gesendet oder Abbrechen auszuwählen. Bericht als gesendet markieren?',
      sent: 'Gesendet',
      notSent: 'Nicht gesendet',
      stay: 'Zurück',
    },
  },
  ihkOselgb: {
    feedback: {
      savedTitle: 'IHK-Bericht gespeichert.',
      savedDescription:
        'Bericht von {{start}} bis {{end}} wurde bei der IHK gespeichert.',
      saveErrorTitle: 'IHK-Speicherung fehlgeschlagen.',
      saveErrorDescription:
        'Bericht von {{start}} bis {{end}} konnte nicht bei der IHK gespeichert werden. {{message}}',
      skippedTitle: 'IHK-Speicherung übersprungen.',
      skipped: {
        'unsupported-link': 'Der hinterlegte IHK-Link wird nicht unterstützt.',
        'password-missing': 'Es ist kein IHK-Passwort hinterlegt.',
        'apprentice-identifier-missing':
          'Die Azubi-Identnummer fehlt in den Settings.',
        'encryption-unavailable':
          'Der sichere Systemspeicher ist nicht verfügbar.',
        unknown: 'Die IHK-Speicherung ist nicht aktiv.',
      },
    },
    fallbackDialog: {
      title: 'IHK-Speicherung fehlgeschlagen',
      description:
        'Der IHK-Request für {{range}} ist fehlgeschlagen: {{message}} Soll der Wochenbericht trotzdem als gesendet markiert werden?',
      no: 'Nein',
      submitAndOpen: 'Ja, IHK Seite öffnen',
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
    selectorPlaceholder: 'Vollständige Woche auswählen',
    completeWeeksTitle: 'Nur vollständige Wochen',
    completeWeeksDescription:
      'Export ist nur möglich, wenn für alle sieben Tage der Woche Tagesberichte vorhanden sind.',
    emptyTitle: 'Keine PDF-Vorschau verfügbar',
    empty: 'Zuerst eine vollständige Woche auswählen.',
    noCompleteWeeks:
      'Aktuell gibt es keine vollständige Woche, die als PDF exportiert werden kann.',
    feedback: {
      selectWeekFirst: 'Vollständige Woche erforderlich.',
      exportCanceled: 'PDF-Export abgebrochen.',
      exported: 'PDF wurde exportiert.',
      exportError: 'PDF-Export fehlgeschlagen.',
    },
  },
  reportsOverview: {
    title: 'Berichte Übersicht',
    description: 'Scrollbare Übersicht aller vorhandenen Tagesdaten.',
    entriesTitle: 'Alle Einträge',
    filters: {
      title: 'Filter',
      searchPlaceholder: 'Einträge suchen...',
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
      calendarWeek: 'KW',
      calendarWeekValue: 'KW{{week}}',
      openDailyTooltip: 'Tagesbericht vom {{date}} öffnen',
      openWeeklyTooltip: 'Aktionen für Wochenbericht {{start}} bis {{end}}',
      noResults: 'Keine Einträge gefunden.',
    },
    weeklyAction: {
      title: 'Wochenbericht',
      description: 'Aktion für {{range}} auswählen.',
      open: 'Wochenbericht öffnen',
      saveAtIhk: 'Wochenbericht bei der IHK speichern',
      cancel: 'Abbrechen',
      ihkInactiveReason:
        'IHK-Speicherung ist nur mit OSELGB-Link und hinterlegtem IHK-Passwort aktiv.',
      ihkUnsupportedLinkReason:
        'Der hinterlegte IHK-Link wird für die automatische Speicherung nicht unterstützt.',
    },
    pagination: {
      summary: '{{start}}-{{end}} von {{total}} Einträgen',
      page: 'Seite {{page}} / {{total}}',
      previous: 'Zurück',
      next: 'Weiter',
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
      localFile: 'Lokaler Import',
      loadDrive: 'Drive-Backups',
      useDriveFile: 'Backup anwenden',
      compareTitle: 'Berichte-Vergleich',
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
      description: 'Settings als JSON laden oder aus Google Drive auswählen.',
      chooseFile: 'Lokaler Import',
      loadDrive: 'Drive-Backups',
      useDriveFile: 'Backup anwenden',
      compareTitle: 'Settings-Vergleich',
      current: 'Lokal',
      incoming: 'Importiert',
      target: 'Zielzustand nach Import',
      confirmTitle: 'Import-Bestätigung',
      confirmDescription:
        'Exportzeitpunkt: {{importedAt}}. Überschrieben werden nur vorhandene Bereiche: {{areas}}.',
      noAffectedAreas: 'Keine Bereiche',
      areas: {
        onboarding: 'Onboarding-Daten',
        appUi: 'Oberflächen-Einstellungen',
        absence: 'Abwesenheiten',
        backup: 'Backup-Einstellungen',
      },
    },
    decryption: {
      title: 'Backup entschlüsseln',
      description:
        'Dieses Backup ist verschlüsselt. Entschlüsselung ist per Passwort oder verfügbarer Google-Wiederherstellung möglich.',
      passwordPlaceholder: 'Backup-Passwort',
      password: 'Mit Passwort entschlüsseln',
      google: 'Mit Google entschlüsseln',
      passwordRequired: 'Passwort erforderlich.',
    },
    feedback: {
      openFileCanceled: 'Dateiauswahl abgebrochen.',
      settingsPrepared: 'Settings-Import vorbereitet.',
      settingsPrepareError: 'Settings-Import konnte nicht vorbereitet werden.',
      settingsApplied: 'Settings importiert.',
      settingsApplyError: 'Settings-Import fehlgeschlagen.',
      settingsCanceled: 'Settings-Import abgebrochen.',
      reportsPrepared: 'Berichte-Import vorbereitet.',
      reportsPrepareError: 'Berichte-Import konnte nicht vorbereitet werden.',
      reportsApplied: 'Berichte importiert.',
      reportsApplyError: 'Berichte-Import fehlgeschlagen.',
      reportsCanceled: 'Berichte-Import abgebrochen.',
      driveLoaded: 'Drive-Backups geladen.',
      noDriveReports: 'Keine Einträge-Backups in Google Drive vorhanden.',
      noDriveSettings: 'Keine Settings-Backups in Google Drive vorhanden.',
      driveError: 'Drive-Import fehlgeschlagen.',
      driveConnected: 'Drive-Verbindung aktualisiert.',
    },
  },
  export: {
    title: 'Export',
    description:
      'Berichte und Settings lokal oder in Google Drive exportieren.',
    actions: {
      localBackup: 'Lokales Backup',
      driveBackup: 'Backup zu Drive',
    },
    reports: {
      title: 'Berichte exportieren',
      description:
        'Berichte lokal speichern oder direkt in Google Drive sichern.',
    },
    settings: {
      title: 'Settings exportieren',
      description:
        'Settings lokal speichern oder direkt in Google Drive sichern.',
    },
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
        'Google-Konto oder Drive-Rechte fehlen. Verknüpfung und Berechtigungserteilung sind erforderlich.',
      oauthUnavailable: 'Google OAuth ist nicht konfiguriert.',
      connectedAccount: 'Verknüpftes Konto: {{email}}',
      changeAccountLink: 'Google Drive-Kontowechsel',
      openBackupFolder: 'Backup-Ordner öffnen',
      connect: 'Drive-Verbindung herstellen',
      export: 'Backup zu Drive',
      manualBackup: 'Manuelles Backup',
    },
    encryptionDialog: {
      title: 'Backup-Verschlüsselung',
      description:
        'Verschlüsselte Backups schützen Berichte und Settings auch außerhalb dieser App.',
      encrypted: 'Verschlüsselt exportieren',
      recommended: '(empfohlen)',
      plain: 'Unverschlüsselt exportieren',
      plainHint: 'Klartext-JSON',
    },
    feedback: {
      exportCanceled: 'Export abgebrochen.',
      reportsExported: 'Berichte exportiert.',
      reportsExportError: 'Berichte konnten nicht exportiert werden.',
      settingsExported: 'Settings exportiert.',
      settingsExportError: 'Settings konnten nicht exportiert werden.',
      settingsScopeError:
        'Settings-Backup-Auswahl konnte nicht gespeichert werden.',
      driveConnected: 'Drive-Verbindung aktualisiert.',
      driveExported: 'Backup nach Drive hochgeladen.',
      settingsDriveExported: 'Settings-Backup nach Drive hochgeladen.',
      driveError: 'Drive-Export fehlgeschlagen.',
      manualBackupTriggered: 'Manuelles Backup wurde gestartet.',
      manualBackupError: 'Manuelles Backup fehlgeschlagen.',
    },
  },
} as const;

export default deTranslation;
