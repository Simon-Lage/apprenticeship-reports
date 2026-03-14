Bitte beachte folgende Punkte:

- Denke **IMMER** extra hart nach!
- **Niemals** Kommentare im Code
- **Immer** auf Verantwortlichkeiten achten
- **Best Practice Only**
- **Niemals** Code duplizieren
- **Immer** auf Lesbarkeit achten
- **Immer** auf Performance achten
- Ein **modernes Design** ist sehr, sehr wichtig!
- Wir nutzen **shadcn** und **tailwindcss** für die UI.
- Wenn es eine fertige component gibt für etwas das du umsetzen willst in shadcn, dann prüfe, ob sie allen Anforderungen entspricht und nutze sie.
- Das soll eine Elektron-React-App sein.
- Unter apprenticeship-reports\src\renderer\components\ui habe ich bereits alle shadcn-compoents importiert, die ich für nötig halte.
- Wir gehen Schritt für Schritt vor.
- Nutzerinputs müssen immer validiert werden.

---

## Endziele

- Anwendung hat verpflichtenden lokalen Passwort-Login und optionalen Google-Login

  - Ein lokales Passwort muss immer eingerichtet sein (nicht optional).
  - Google-Login ist optional als zweite Authentifizierungsmoeglichkeit.
  - Fuer die Authentifizierung reicht entweder Passwort oder Google (nicht beides gleichzeitig notwendig).
  - Beim Login option angemeldet zu bleiben als switch
  - Alle 30 Tage erneute Authentifizierung

- Verpflichtende Google Drive Anbindung

  - Wenn auf Google Drive zugegriffen wird und Rechte fehlen, sollen diese erfragt werden und die Anwendung ist gesperrt, bis die Rechte erteilt wurden.
  - Es soll direkt nach dem Öffnen geprüft werden, ob die nötigen Rechte vorhanden sind und diese dann abgefragt werden, jedoch nicht vor dem Login!
  - Beim der Frage für die Rechte soll auch erklärt werden, warum diese benötigt werden, nämlich für regelmäßige Backups.

- Lokale Datenbank die gesperrt ist, wenn weder lokales Passwort noch Google-Login aktiv ist.

- Regelmäßige Backups der lokalen Datenbank auf Google Drive. Backups in folgenden Fällen, falls es Änderungen gab:
  - Backup nach dem Schreiben des 10ten Tagesberichtes seit dem letzten Backup.
  - Backup beim Schließen der App
  - Beim Öffnen der App, falls es noch vom letzten Verwenden ungespeicherte Änderungen gibt.
  - Er soll sich immer merken, wann das letzte Backup erfolgreich durchgeführt wurde.
  - Backups sollten auch manuell möglich sein.

- Verbindliche Import-/Export-Spezifikation (Reports und Settings):
  - Detailreferenz: `docs/import-export-spec.md` (verbindlich fuer Implementierung und UI).
  - Akzeptiertes Dateiformat ist ausschließlich JSON.
  - Import von nicht-JSON ist immer ein harter Fehler und wird abgelehnt.
  - Es gibt genau zwei Datenbereiche für Import/Export:
  - `reports` mit `weeks` und darin `days`
  - `settings`
  - Andere Bereiche werden nicht importiert/exportiert (keine Auth-, Drive-, Onboarding-, Backup-Metadaten).

- Reports-JSON (Backup) ist verbindlich so strukturiert:
  - Root enthält `weeks` als Array.
  - `weeks` darf als Array leer sein, aber jeder Week-Eintrag muss ein valides, nicht-leeres Week-Objekt sein.
  - Eine Week darf keine Days enthalten (leeres `days`-Array ist erlaubt).
  - Eine Week enthält mindestens:
  - `weekStart` (YYYY-MM-DD), `weekEnd` (YYYY-MM-DD)
  - `updatedAt` (ISO-8601)
  - `hash` (deterministisch berechnet)
  - `submitted` (boolean)
  - `submittedToEmail` (string oder null)
  - `area` (string oder null)
  - `days` (Array)
  - Jeder Day enthält mindestens:
  - `date` (YYYY-MM-DD)
  - `content`/Werte der Tagesinhalte
  - `updatedAt` (ISO-8601)

- Hash-Regeln für Weeks:
  - Es gibt eine zentrale Helper-Funktion, die aus einer Week immer deterministisch denselben Hash erzeugt.
  - Grundlage für den Hash sind die fachlichen Week-Daten inklusive Days, aber ohne das Feld `hash` selbst.
  - Serialisierung für die Hash-Bildung ist stabil (gleiche Datenreihenfolge ergibt denselben Hash).
  - Bei Import-Vergleich gilt:
  - Gleicher Hash => Week wird als unverändert behandelt.
  - Unterschiedlicher Hash => Week gilt als geändert und erscheint in der Vergleichsansicht.

- Timestamp-Regeln für Weeks:
  - `updatedAt` wird nicht beim Export/Import neu erzeugt.
  - `updatedAt` wird immer dann aktualisiert, wenn sich in der App fachliche Week-Daten ändern:
  - Day-Inhalt geändert
  - Day hinzugefügt/entfernt
  - Week-Metadaten geändert (z. B. `submitted`, `submittedToEmail`, `area`)
  - Für automatische Konfliktauflösung ohne manuelle Auswahl gilt:
  - Neuere `updatedAt` gewinnt.

- Reports-Import-Procedere (verlustsicher):
  - 1) JSON parsen und strikt validieren.
  - 2) Import-Preview erzeugen (Diff/Konflikte).
  - 3) Vor Anwendung einen lokalen Recovery-Snapshot erstellen.
  - 4) Compare-Ansicht anbieten (Git-Diff-artig, nebeneinander, synchrones Scrolling).
  - 5) Übernahme anwenden (pro Konflikt manuell oder automatisch per Timestamp-Regel).
  - 6) Bei Fehlern vollständiger Rollback auf Recovery-Snapshot.
  - In der Compare-Ansicht werden nur Weeks angezeigt, deren Hash unterschiedlich ist.
  - Nutzer kann pro konfliktbehafteter Week zwischen lokal und importiert wählen.
  - Wenn Nutzer ohne manuelle Auswahl fortfährt, gilt standardmäßig `latest-timestamp`.

- Settings-Import/-Export:
  - Settings haben eigenes JSON-Format (separat von Reports).
  - Settings-Export enthält einen Export-Zeitpunkt (`exportedAt`) und die Settings-Werte.
  - Keine App-Version im Export erzwingen (vorerst bewusst nicht Teil der Spezifikation).
  - Vor Settings-Import immer Warnung, dass aktuelle Settings überschrieben werden können.
  - Danach CompareLayout mit zwei Seiten, synchronem Scrolling und Datum/Zeiten als Überschrift je Seite.
  - Die Settings-Seite bekommt Compare-Mode-Information und nutzt externe Diff-Logik (Hook), um Unterschiede zu markieren.

- Diese Anwendung braucht ein Onboarding:
  - Dabei gibt es mehrere Abschnitte, teils mit optionalen Angaben. Alle diese Angaben kann man später noch in den Settings umstellen.
  - Falls das Onboarding gestoppt wird, soll beim nächsten Start der Anwendung wieder dort weitergemacht werden und auf den vorherigen Teilen ist alles vom letzten Mal vorausgefüllt.
  - Jegliche eingabe auch optionale muss validiert werden, bevor weiter gedrückt weren kann und nur valide Eingaben werden gespeichert.
  - Nach erfolgreicher Authentifizierung ist die App bis zum Abschluss aller Pflicht-Onboardinginformationen vollständig gesperrt.
  - Bereits vorhandene gültige Onboardinginformationen überspringen die zugehörigen Schritte automatisch; angezeigt werden nur tatsächlich fehlende Schritte.
  - Fehlt später eine zuvor vorhandene Pflichtinformation, muss das Onboarding beim nächsten Appstart nach der Authentifizierung genau für diese fehlende Information erneut starten und die App bis zur Ergänzung gesperrt bleiben.
- Bei jedem Wochenbericht der fertig ist, soll mit dem Wochenbericht ein Hash dieses Wochenberichtes gespeichert werden.
