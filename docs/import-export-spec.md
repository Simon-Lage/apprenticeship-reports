# Import/Export Spezifikation

## Geltungsbereich

Diese Spezifikation ist verbindlich fuer die Datenbereiche:

- `reports` (Weeks + Days)
- `settings`

Nicht Teil von Import/Export:

- Authentifizierung (Passwort/Google-Session)
- Google-Drive-Tokens und Berechtigungsstatus
- Onboarding-Progress
- Backup-Laufzeitstatus

## Dateiformate

- Es werden ausschliesslich JSON-Dateien akzeptiert.
- Jeder nicht-JSON-Import wird strikt abgewiesen.

## Reports JSON

### Struktur

```json
{
  "exportedAt": "2026-03-14T12:00:00.000Z",
  "reports": {
    "weeks": [
      {
        "weekStart": "2026-03-09",
        "weekEnd": "2026-03-13",
        "updatedAt": "2026-03-14T11:59:00.000Z",
        "hash": "sha256:...",
        "submitted": true,
        "submittedToEmail": "trainer@example.com",
        "area": "Backend",
        "days": [
          {
            "date": "2026-03-09",
            "updatedAt": "2026-03-14T11:00:00.000Z",
            "content": {
              "tasks": "..."
            }
          }
        ]
      }
    ]
  }
}
```

### Regeln

- `weeks` ist immer ein Array.
- `weeks` darf leer sein.
- Ein einzelner Week-Eintrag darf nicht leer sein und muss voll validierbar sein.
- `days` darf leer sein.
- Week-Felder:
- `weekStart` (YYYY-MM-DD)
- `weekEnd` (YYYY-MM-DD)
- `updatedAt` (ISO-8601)
- `hash`
- `submitted` (boolean)
- `submittedToEmail` (string oder `null`)
- `area` (string oder `null`)
- `days` (Array)

## Week Hash

- Es gibt eine zentrale Helper-Funktion fuer die Hash-Erstellung.
- Die Hash-Bildung ist deterministisch.
- Die Hash-Eingabe umfasst die fachlichen Week-Daten inklusive `days`, aber ohne Feld `hash`.
- Die Serialisierung fuer die Hash-Bildung ist stabil.
- Gleicher Inhalt muss immer denselben Hash liefern.

## Timestamp Regeln

- `updatedAt` wird bei fachlichen Aenderungen gesetzt, nicht bei Export/Import.
- Week-`updatedAt` wird aktualisiert bei:
- Aenderung eines Day-Inhalts
- Hinzufuegen/Entfernen eines Days
- Aenderung von Week-Metadaten (`submitted`, `submittedToEmail`, `area`)

## Konfliktlogik beim Reports-Import

- Week-Identitaet wird ueber `weekStart + weekEnd` bestimmt.
- Hash gleich:
- Kein Konflikt, keine Anzeige in Compare.
- Hash unterschiedlich:
- Konfliktkandidat, Anzeige in Compare.
- Compare-Ansicht:
- Nebeneinander (Git-Diff-artig)
- Synchrones Scrolling
- Navigation nur ueber differierende Weeks
- Pro differierender Week kann Nutzer waehlen:
- `local`
- `imported`
- Ohne manuelle Auswahl gilt Default:
- `latest-timestamp` (neuere `updatedAt` gewinnt)

## Sicheres Import-Procedere (Reports)

- 1. JSON parsen und strikt validieren.
- 2. Import-Preview/Diff berechnen.
- 3. Lokalen Recovery-Snapshot erzeugen.
- 4. Compare-Ansicht bereitstellen.
- 5. Entscheidungen anwenden (manuell oder Default-Regel).
- 6. Transaktional speichern.
- 7. Bei Fehlern vollstaendiger Rollback auf Recovery-Snapshot.

## Settings JSON

### Struktur

```json
{
  "exportedAt": "2026-03-14T12:00:00.000Z",
  "settings": {
    "...": "..."
  }
}
```

### Regeln

- Settings sind ein separater Import/Export-Fluss von Reports.
- Keine erzwungene App-Versionsangabe im Export (vorerst).
- Vor Import wird immer gewarnt, dass aktuelle Settings ueberschrieben werden koennen.
- Compare-Ansicht:
- Zwei Seiten nebeneinander
- Synchrones Scrolling
- Ueberschrift mit Zeitstempel pro Seite
- Compare-Mode wird an Seiten weitergegeben
- Externe Diff-Logik markiert Unterschiede

## Default-Entscheidungen bei fehlender Nutzeraktion

- Reports: `latest-timestamp`
- Settings: Import wird nur nach expliziter Bestaetigung angewendet

