codex resume 019be14a-30a8-7ee0-80d8-6aa3766233e4

# 1 Projektinfos

1.1 Als Basis dient das Electron-React-Boilerplate
1.2 Wir nutzen ShadCN für Components, also auch TailwindCSS
1.3 Wir wollen immer erst die Logik umsetzen, dann das UI und dann erst das Styling; im ersten Moment wird nur auf Funktionalität geachtet.
1.4 In den Komponenten selbst darf kein Text vorkommen; wir nutzen i18n für Translations, auch wenn der Text vorerst komplett Deutsch ist.

## 2 Regeln

2.1 Vor dem Erstellen einer neuen Komponente prüfen, ob bereits eine ShadCN- oder sonstige Komponente existiert, die wiederverwendet werden kann, und ob es in ShadCN eine passende Komponente gibt.
2.1.1 Falls eine passende ShadCN-Komponente existiert, muss sie verwendet werden.
2.1.2 Falls keine passende ShadCN-Komponente existiert, darf sie installiert und genutzt werden.
2.2 Verantwortlichkeiten sind strikt einzuhalten: jede Komponente hat genau eine Aufgabe.
2.3 Falls etwas gefordert wird, das den Regeln widerspricht, nicht ausführen und auf die korrekte Vorgehensweise hinweisen.
2.4 Kommentare im Code sind verboten.
2.5 Änderungen außerhalb von `\apprenticeship-reports\src\renderer` sind erlaubt, wenn der User sie explizit anfordert.
2.6 Beim Beheben von Fehlern immer nur das absolut Nötigste ändern, um Seiteneffekte zu vermeiden.
2.7 Immer auf Deutsch antworten.
2.8 `npm install -g @openai/codex@latest`
2.9 Bei Unsicherheit Context7 fuer Bibliotheksdokumentation nutzen.

## 3 Aufbau

3.1 Welcome Page, falls auf der Installation noch nie eingeloggt wurde; nutzt das Welcome Layout unter `/welcome`.
3.2 Login Page, falls ein Account existiert, man aber nicht eingeloggt ist.
3.3 Dashboard nach erfolgreichem Login.
3.4 Alles unter `/auth` (inkl. Login) nutzt das Auth Layout.
3.5 Alles außerhalb von `/welcome` und `/auth` nutzt das Dashboard Layout.
3.6 Jede Page hat ihren eigenen Ordner unter `/pages` mit eigenem `/components`-Ordner.

## 4 Projektziel

**MoSCoW-Priorisierung – Tool zur Erstellung von Ausbildungsnachweisen (final)**

### 4.1 Must (Muss-Ziele)

4.1.1 Muss Authentifizierung beinhalten.
4.1.2 Muss die Möglichkeit bieten, Daten zu exportieren.
4.1.3 Muss Datenintegrität sicherstellen.
4.1.4 Muss revisionssicher speichern.
4.1.5 Muss klare Erleichterung gegenüber manuellem Schreiben darstellen.
4.1.6 Berichte werden als Tagesberichte gespeichert, Wochenberichte werden daraus abgeleitet.
4.1.7 Stundenplan muss einpflegbar sein und beim Anlegen der Tagesberichte berücksichtigt werden.
4.1.8 Updates müssen abwärtskompatibel sein.

### 4.2 Should (Soll-Ziele)

4.2.1 PDF-Export für Berichte.
4.2.2 Vorformatierte Berichte.
4.2.3 Onboarding-Prozess.
4.2.4 Tabellarische Auflistung der Berichte.
4.2.5 Such- und Filterfunktion (Zeitraum, Fachrichtung, Tätigkeiten usw.).
4.2.6 Urlaub und Krankheit eintragbar.
4.2.7 Feiertage importierbar, aber Anwendung muss ohne Import funktionieren.

### 4.3 Could (Kann-Ziele)

4.3.1 Nutzereinstellungen für verschiedene Designs.
4.3.2 Nutzereinstellungen für Vorformatierung der Berichte.

### 4.4 Won’t (Wird nicht umgesetzt)

4.4.1 Keine Abhängigkeit von externen Services; Anwendung funktioniert autonom.

---

# 6 Datenbankplanung (Text)

## 6.1 Grundsätze

6.1.1 Alle Tabellennamen und Spaltennamen sind Englisch.
6.1.2 Jede `id` ist eine UUID, außer explizit als AUTO INCREMENT definiert.
6.1.3 Alle Textfelder werden vor Speicherung getrimmt.
6.1.4 Es gibt genau einen User, daher keine `users`-Tabelle.
6.1.5 Nutzerinfos und Settings liegen in `config`.

## 6.2 Tabellen

### 6.2.1 `config`

- `id` (uuid, pk)
- `name` (text)
- `surname` (text)
- `ihk_link` (text)
- `department` (text)
- `trainer_email` (text)
- `training_start` (date)
- `training_end` (date)
- `settings` (json)
- weitere Felder folgen

### 6.2.2 `timetable`

- `id` (uuid, pk)
- `teacher` (text)
- `subject` (text)
- `weekday` (int)
- `order` (int)

### 6.2.3 `daily_reports`

- `id` (uuid, pk)
- `created_at` (datetime)
- `updated_at` (datetime)
- `day_type` (enum: school, work, leave)
- `weekly_report_id` (int, fk -> `weekly_reports.id`, nullable)

### 6.2.4 `daily_report_entries`

- `daily_report_id` (uuid, fk -> `daily_reports.id`)
- `entry_id` (int, fk -> `entries.id`)
- `position` (int)
- pk: (`daily_report_id`, `entry_id`)

### 6.2.5 `entries`

- `id` (int, pk, auto increment)
- `activities` (text)
- `day_type` (enum: school, work, leave)

### 6.2.6 `absences`

- `id` (uuid, pk)
- `type` (enum: vacation, sick, weekend, holiday, school_break, other)
- `from_date` (date)
- `to_date` (date)
- `note` (text, nullable)

### 6.2.7 `weekly_reports`

- `id` (int, pk, auto increment)
- `week_start` (date)
- `week_end` (date)
- `department_when_sent` (text, nullable)
- `trainer_email_when_sent` (text, nullable)
- `sent` (boolean)

## 6.3 Beziehungen (Kardinalität)

6.3.1 `weekly_reports` 1 — n `daily_reports`
6.3.2 `daily_reports` n — n `entries` via `daily_report_entries`

## 6.4 Hinweise zur Konsistenz

6.4.1 `department_when_sent` und `trainer_email_when_sent` werden beim Speichern aus `config` kopiert und ändern sich später nicht mit.
6.4.2 `day_type` in `entries` muss zum `day_type` des zugehörigen `daily_reports` passen.
6.4.3 `weekday` und `order` in `timetable` sind Pflichtfelder zur stabilen Sortierung.

# 5 A.5 Pflichtenheft

## 5.1 Zielbestimmung

### 5.1.1 Plattform

5.1.1.1 Anwendung als Desktop-App via Electron (Chromium/Node.js).
5.1.1.2 UI mit React umgesetzt.
5.1.1.3 Offline nutzbar; Internet optional.
5.1.1.4 Lauffähig auf Windows und Linux (64-bit), jeweils mit Installer.
5.1.1.5 Git als Versionierung; Repository auf GitHub o. ä.
5.1.1.6 Releases über GitHub Releases; Auto-Update-Mechanismus; abwärtskompatible Updates.

### 5.1.2 Datenhaltung

5.1.2.1 Lokale Speicherung im OS-konformen App-Datenverzeichnis; SQLite.
5.1.2.2 Schema- und Wertevalidierung (Pflichtfelder, Datentypen, Wertebereiche).
5.1.2.3 Tagesberichte sind primär; Wochenberichte werden deterministisch abgeleitet.
5.1.2.4 Stundenplan separat gespeichert; regelbasierte Berücksichtigung bei Tagesberichten.
5.1.2.5 Datenexport/Import als dokumentiertes Archivformat (z. B. JSON).
5.1.2.6 PDF-Export für Berichte/Übersichten.
5.1.2.7 Optionale Feiertagsimporte; Anwendung bleibt ohne Import voll funktionsfähig.
5.1.2.8 Migrationen mit Schema-Versionen; Leser für ältere Schemata.

### 5.1.3 Benutzeroberfläche

5.1.3.1 Vorformatierte Berichtsvorlagen; optionale Anpassungen.
5.1.3.2 Desktop-only, keine Mobile-Auflösungen.
5.1.3.3 Routing über React Router.
5.1.3.4 Komponenten primär aus ShadCN, ggf. erweitert.
5.1.3.5 Styling via Tailwind.

### 5.1.4 Geschäftslogik

5.1.4.1 Wochenberichte aus Tagesberichten aggregieren.
5.1.4.2 Änderungen an Tagesberichten aktualisieren Aggregationen.
5.1.4.3 Regelbasierte Voreinträge aus Stundenplan (Unterricht/Arbeitszeiten/Feiertage), überschreibbar, Plausibilitätsprüfung.
5.1.4.4 Such-/Filterlogik mit kombinierbaren Kriterien (UND/ODER, Zeitraum, Textsuche).
5.1.4.5 Exportlogik:
5.1.4.5.1 Datenexport als vollständiges Archiv.
5.1.4.5.2 PDF-Export aus Vorlagen.

### 5.1.5 Sicherheit

5.1.5.1 Authentifizierung über Google Auth; zusätzlich lokales Backup-Passwort für vollständige Offline-Funktionalität.
5.1.5.2 Datenschutz: Übertragung an Dritte nur bei Google-Login oder optionaler Google-Drive-Sicherung.

---


Passwort:
fsdDf4etw$rge4rt4

