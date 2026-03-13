# Implementation Notes

## Auth
- Das App-Login ist fachlich getrennt von Google Drive.
- Passwort-Login ist ein vollwertiger App-Login.
- Google-Login ist eine alternative App-Login-Methode.
- Google Drive wird erst nach erfolgreichem App-Login gekoppelt.
- Wenn die benoetigten Drive-Rechte fehlen, bleibt die App logisch gesperrt, bis die Verbindung und die Scopes vorhanden sind.
- Der Google-Login verwendet jetzt einen Desktop-OAuth-PKCE-Flow mit lokalem Loopback-Callback.
- Fuer den echten End-to-End-Login muss `GOOGLE_OAUTH_CLIENT_ID` gesetzt sein.
- Optional kann auch `GOOGLE_OAUTH_CLIENT_SECRET` gesetzt werden.

## Lokale Datenbank
- Der aktuelle Stand nutzt wieder eine echte lokale SQLite-Datenbank als Primaerspeicher fuer den App-Metadatenzustand.
- Bestehende Legacy-Staende aus `app-metadata.json` werden beim ersten Zugriff in die SQLite-Datenbank uebernommen.
- Die JSON-Datei ist damit nur noch Legacy-Importquelle und nicht mehr der regulaere Primaerspeicher.
- Die alte SQLCipher-basierte Implementierung aus frueheren Commits ist im aktuellen Branch nicht mehr vorhanden gewesen.
- Der jetzt eingebaute Stand verwendet die in Node verfuegbare SQLite-Laufzeit und haelt die Persistenzschicht sauber von der Anwendungslogik getrennt.
- Ein Umstieg auf SQLCipher ist fuer den produktiven Sicherheitsstand geplant.

## Backup Formate
- Einzelne Wochenberichte koennen separat als PDF exportiert werden.
- Das eigentliche App-Backup ist eine grosse JSON-Datei mit allen lokal gespeicherten Berichten und dem zugehoerigen App-Zustand.
- Das Drive-Backup nutzt dasselbe JSON-Format wie das lokale Backup.

## Google Drive
- Im Drive-Root soll der Ordner `AppRep` verwendet werden.
- Automatische und manuelle JSON-Backups werden in diesem Ordner abgelegt.
- Ein Backup-Import soll den `AppRep`-Ordner lesen, die vorhandenen Backups auflisten und dem Nutzer eine Auswahl geben.
- Wenn keine expliziten Drive-Scopes gesetzt sind, wird standardmaessig `https://www.googleapis.com/auth/drive.file` verwendet.
- Die Main-Logik kann jetzt Drive-Backups hochladen, vorhandene JSON-Backups listen und ein ausgewaehltes Backup direkt fuer den Import herunterladen.

## Import Regeln
- Vor einem Backup-Restore wird immer ein lokaler Recovery-Snapshot des aktuellen Standes erzeugt.
- Settings-Import und Backup-Import haben vorbereitende Preview-Schritte und koennen abgebrochen werden.
- Konflikte bei bereits lokal vorhandenen Wochen koennen mit `local`, `backup` oder `latest-timestamp` aufgeloest werden.
- `latest-timestamp` ist die Standardstrategie, wenn der Nutzer nichts auswaehlt.
- Bei `latest-timestamp` wird pro kollidierendem Tagesbericht der neuere `updatedAt`-Stand uebernommen.
- Nicht ueberschneidende Wochen und Tagesberichte werden immer zusaetzlich uebernommen.
- Bei Konfliktwochen werden bestehende Wochenhashes verworfen, damit keine veralteten Hashes nach einem Merge erhalten bleiben.

## Onboarding
- Standardmaessig werden die Schritte `identity`, `training-period` und optional `workplace` verwendet.
- Onboarding-Schritte sollen aus den bereits benoetigten Daten des vorhandenen Datenmodells abgeleitet werden.
- Optionale Schritte muessen sauber uebersprungen und spaeter in den Settings weiter bearbeitet werden koennen.
- Nur valide Eingaben werden gespeichert.
- Validierte Onboarding-Drafts werden direkt unter `settings.current.values.onboarding` gespiegelt, damit dieselben Angaben spaeter in den Settings weiterverwendet werden koennen.