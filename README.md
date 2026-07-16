# Apprenticeship Reports

Apprenticeship Reports ist eine Electron-React-App für digitale Ausbildungsberichte. Die Anwendung verwaltet Tagesberichte, aggregiert daraus Wochenberichte, unterstützt lokale Authentifizierung, optionale Google-Anbindung und JSON-basierte Import-/Export-Flüsse.

Der Fokus liegt auf lokal kontrollierten Daten, nachvollziehbaren Sicherungen und einer UI, die für regelmäßige Berichtspflege optimiert ist.

## Download

Die aktuelle Windows-Version steht über GitHub Releases bereit:

[Download for Windows](https://github.com/Simon-Lage/apprenticeship-reports/releases/latest/download/Apprenticeship-Reports-Setup.exe)
Nur die Datei `Apprenticeship-Reports-Setup.exe` ist für die manuelle Installation vorgesehen. Dateien wie `latest.yml` und `*.blockmap` werden vom Auto-Updater genutzt.

[![Tests](https://github.com/Simon-Lage/apprenticeship-reports/actions/workflows/test.yml/badge.svg)](https://github.com/Simon-Lage/apprenticeship-reports/actions/workflows/test.yml)
[![Release](https://img.shields.io/github/v/release/Simon-Lage/apprenticeship-reports?label=latest%20release)](https://github.com/Simon-Lage/apprenticeship-reports/releases/latest)

AppRep befindet sich aktuell in einer frühen Alpha-Version.

Die App ist nur für den experimentellen persönlichen Gebrauch bestimmt. Sie kann Fehler enthalten, Daten falsch verarbeiten oder sich in zukünftigen Versionen grundlegend ändern.

Die Nutzung erfolgt auf eigene Verantwortung. Ich übernehme keine Haftung für Schäden, Datenverlust, fehlerhafte oder nicht akzeptierte Ausbildungsberichte oder sonstige Folgen der Nutzung.

Datenschutz- und Sicherheitsstandards befinden sich noch in Arbeit und sind nicht als produktionsreif anzusehen. Bitte lege regelmäßig eigene Backups an und prüfe alle exportierten Berichte vor der offiziellen Verwendung selbst.



## Aktuelle Version

- Version: `v0.0.35-alpha.1`
- Veröffentlicht am: `16.07.2026`

## Funktionen

- Lokaler Passwort-Login mit optionaler Angemeldet-bleiben-Funktion
- Optionaler Google-Login als zusätzliche Authentifizierungsmöglichkeit
- Geführtes Onboarding für Pflichtdaten wie Ausbildungszeitraum, Bundesland, Ausbildungsabschnitt und Betreuer-E-Mail
- Tagesberichte für Arbeitstage, Schultage, freie Tage und Abwesenheiten
- Stundenplanverwaltung mit Lehrern, Fächern und bis zu 10 Schulstunden pro Tag
- Übersicht über Tagesberichte mit Wochenabgrenzung, Suche und Filterung
- Wochenberichte mit aggregierten Inhalten aus Tagesberichten
- PDF-Vorschau und Export für Wochenberichte
- Manuelle und automatische Abwesenheitsverwaltung
- Feiertags- und Ferien-Synchronisation über OpenHolidays
- Reports- und Settings-Import/-Export als JSON
- Vergleichsansichten für überschreibende Imports mit synchronem Scrolling
- Google-Drive-Backups für Reports und Settings
- Auto-Update-Unterstützung für paketierte Releases

## Tech Stack

- Electron
- React 19
- TypeScript
- React Router
- Tailwind CSS
- shadcn/ui und Radix UI
- Framer Motion
- i18next
- Zod
- Jest
- SQLite mit SQLCipher-Unterstützung über `better-sqlite3-multiple-ciphers`
- Electron Builder

## Voraussetzungen

- Node.js `>=14.x`
- npm `>=7.x`
- Windows, macOS oder Linux für die Entwicklung

Für Google OAuth und Google Drive ist eine eigene Google-OAuth-Konfiguration erforderlich.
Google Services befinden sich aktuell noch in der Closed-Test-Phase und können deshalb nur mit freigegebenen Google-Accounts genutzt werden.

## Installation für Entwicklung

```bash
npm install
```

## Entwicklung starten

```bash
npm start
```

Im Development-Modus verwendet Electron den lokalen User-Data-Pfad:

```text
.dev-data/user-data
```

Der Renderer läuft standardmäßig über den Webpack Dev Server auf Port `1212`.

## Nützliche Skripte

| Befehl | Zweck |
| --- | --- |
| `npm start` | Startet die App im Development-Modus |
| `npm run build` | Baut Main- und Renderer-Bundle |
| `npm run package` | Erstellt ein paketiertes Electron-Build |
| `npm test` | Führt Jest-Tests aus |
| `npm run lint` | Prüft den Code mit ESLint |
| `npm run lint:fix` | Führt automatische ESLint-Fixes aus |
| `npm run seed:dev-test-data` | Erstellt Entwicklungs-Testdaten |
| `npm run reset:dev-state` | Setzt den lokalen Entwicklungszustand zurück |

## Konfiguration

Lokale Entwicklungswerte können in einer `.env.local` im Projektroot hinterlegt werden.

```env
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_DRIVE_REQUIRED_SCOPES=https://www.googleapis.com/auth/drive.file
```

`GOOGLE_OAUTH_CLIENT_SECRET` ist optional. Wenn `GOOGLE_DRIVE_REQUIRED_SCOPES` nicht gesetzt ist, nutzt die App standardmäßig `https://www.googleapis.com/auth/drive.file`.

Secrets dürfen nicht committed werden.

## Datenhaltung und Sicherheit

Die App speichert ihre produktiven Daten lokal im Electron-User-Data-Verzeichnis. Im aktuellen Stand nutzt sie eine verschlüsselte SQLite-Datenbank mit separatem Auth-Envelope.

Wichtige Eigenschaften:

- Lokales Passwort ist verpflichtend.
- Die lokale Datenbank bleibt gesperrt, solange keine gültige Authentifizierung aktiv ist.
- Das Datenbank-Schlüsselmaterial wird über Passwort, Remembered Session oder Google-Key-Wrap entsperrt.
- Google Drive wird nur für autorisierte Backup- und Restore-Flüsse genutzt.
- Authentifizierungsdaten, Drive-Tokens und Onboarding-Progress sind nicht Teil des Reports-/Settings-Exports.

## Import und Export

Import und Export sind strikt JSON-basiert. Andere Dateiformate werden abgelehnt.

Es gibt zwei getrennte Datenbereiche:

- `reports`: Wochenberichte mit Tagesberichten
- `settings`: Anwendungseinstellungen

Die verbindliche Spezifikation liegt in [`docs/import-export-spec.md`](docs/import-export-spec.md).

Reports werden über deterministische Week-Hashes verglichen. Bei Konflikten zeigt die App nur tatsächlich unterschiedliche Wochen an. Ohne manuelle Auswahl gewinnt standardmäßig der neuere `updatedAt`-Zeitstempel.

## Google Drive Backups

Backups werden in Google Drive unter dem App-Ordner `AppRep` abgelegt.

| Bereich | Ordner | Dateipräfix |
| --- | --- | --- |
| Reports | `AppRep/Entries` | `apprep-backup` |
| Settings | `AppRep/Settings` | `apprep-settings-backup` |

Die App fordert fehlende Drive-Berechtigungen nach dem Login an und erklärt den Zweck der Berechtigung im UI.

## Projektstruktur

```text
src/
  main/       Electron Main Process, IPC, Services, Persistenz
  renderer/   React UI, Seiten, Komponenten, Hooks, i18n
  shared/     Geteilte Schemas, Modelle und Geschäftslogik
  __tests__/  Jest-Tests
docs/         Projektspezifikationen
assets/       App-Icons und Build-Ressourcen
.erb/         Electron-React-Boilerplate Build-Konfiguration
```

## UI und Internationalisierung

Die Oberfläche basiert auf Tailwind CSS, shadcn/ui und Radix UI. UI-Texte werden über i18next gepflegt und liegen unter:

```text
src/renderer/i18n/translations/
```

Neue UI-Texte sollten dort ergänzt und nicht direkt in Komponenten hart codiert werden.

## Releases

Paketierung und Publishing laufen über Electron Builder. Die Release-Konfiguration befindet sich in `package.json` unter `build`.

Windows-Releases werden als NSIS-Installer erzeugt:

```text
Apprenticeship-Reports-Setup.exe
```

Der Auto-Updater verwendet die GitHub-Releases dieses Repositories.

## Tests

```bash
npm test
```

Die Testabdeckung umfasst unter anderem:

- Authentifizierung und Sessions
- Onboarding-Fortschritt
- Tagesbericht-Regeln
- Wochenbericht-Werte und Datumslogik
- Reports-Import und Konfliktauflösung
- Settings-Diffs
- Backup-Policy und Drive-Backups

## Lizenz

Copyright (c) 2025 Simon Lage.

Dieses Projekt ist nur für persönliche oder interne Nutzung freigegeben. Kopieren, Ändern, Veröffentlichen, Verteilen, Unterlizenzieren oder anderweitige Nutzung ist nur mit vorheriger schriftlicher Genehmigung des Rechteinhabers erlaubt.

Enthaltene Drittanbieter-Komponenten können unter abweichenden Lizenzen stehen. Details stehen in [`LICENSE`](LICENSE) und [`LICENSE_ELECTRON`](LICENSE_ELECTRON).
