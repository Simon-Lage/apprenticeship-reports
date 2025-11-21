# Projektinfos
- Als Basis dient das Electron-React-Boilerplate
- Wir nutzen ShadCN für Components, also auch TailwindCSS

## Regeln
- Bevor du eine neue Component erstellen willst, prüfe, ob wir bereits eine ShadCN- oder sonstige Component haben, die du wiederverwenden kannst, und ob es in ShadCN eine passende Komponente gibt, die wir noch nicht importiert haben.
- Verantwortlichkeiten sind extrem wichtig. Achte darauf, dass jede Komponente nur eine Aufgabe hat.
- Falls ich etwas fordere, das den Regeln widerspricht, führe das nicht aus und weise mich darauf hin und wie man es besser machen kann.
- Kommentare im Code sind verboten.
- Niemals ungefragt außerhalb von `\apprenticeship-reports\src\renderer` Änderungen vornehmen.
- Beim Beheben von Fehlern ist es essenziell, immer nur das Nötigste zu ändern, um Seiteneffekte zu vermeiden.
- Antworte immer auf Deutsch.

## Aufbau
- Welcome Page, falls auf der Installation noch nie eingeloggt wurde. Sie hat das Welcome Layout in `/welcome`.
- Login Page, falls auf der Installation bereits ein Account existiert, man aber nicht eingeloggt ist.
- Dashboard, nachdem man sich eingeloggt hat.
- Alles unter `/auth` (also bspw. auch Login) hat das Auth Layout.
- Alles außerhalb von `/welcome` und außerhalb von `/auth` hat das Dashboard Layout.
- Jede Page hat ihren eigenen Ordner unter `/pages` mit eigenem `/components` Ordner.

## Projektziel
**MoSCoW-Priorisierung – Tool zur Erstellung von Ausbildungsnachweisen (final)**

### Must (Muss-Ziele)
- Muss Authentifizierung beinhalten (Vertraulichkeit der Daten).
- Muss die Möglichkeit bieten, die Daten zu exportieren.
- Muss die Datenintegrität sicherstellen.
- Muss revisionssicher speichern (kein nachträgliches, unbemerktes Verändern von Berichten).
- Muss im Endergebnis eine klare Erleichterung gegenüber dem manuellen Schreiben der Berichte darstellen.
- Berichte müssen als Tagesberichte gespeichert werden, auch wenn sie in der Oberfläche als Wochenberichte dargestellt werden.
- Der Stundenplan muss einpflegbar sein und beim Anlegen der Tagesberichte berücksichtigt werden.
- Updates müssen abwärtskompatibel mit vergangenen Datenstrukturen sein.

### Should (Soll-Ziele)
- Berichte sollten per PDF exportierbar sein.
- Berichte sollten vorformatiert sein, damit der Nutzen des Tools gegeben ist.
- Ein Onboarding-Prozess sollte vorhanden sein.
- Berichte sollten tabellarisch auflistbar sein.
- Es sollte eine Such- und Filterfunktion für Berichte geben (z. B. nach Zeitraum, Fachrichtung, Tätigkeiten).
- Urlaub und Krankheit sollte man eintragen können.
- Feiertage sollten importierbar sein aus einem externen Service, jedoch muss die Anwendung auch ohne diesen Import funktionieren.

### Could (Kann-Ziele)
- Nutzereinstellungen für verschiedene Designs.
- Nutzereinstellungen, wie die Vorformatierung der Berichte aussehen soll.

### Won’t (Wird nicht umgesetzt)
- Keine Abhängigkeit von externen Services; die Anwendung muss autonom funktionieren.

---

# A.5 Pflichtenheft

## Zielbestimmung

### Plattform
- Die Anwendung wird als Desktop-App mit Electron implementiert (Chromium/Node.js-Laufzeit).
- Die Benutzeroberfläche wird mit React umgesetzt.
- Die Anwendung ist offline nutzbar und benötigt keine dauerhafte Internetverbindung, jedoch ist eine solche von Vorteil.
- Die Anwendung ist lauffähig auf Windows und Linux (64-bit) und wird jeweils als Installer bereitgestellt.
- Git wird als Versionierungstool eingesetzt und das Repository wird auf GitHub oder einer gleichwertigen Plattform gehostet.
- Releases werden über GitHub Releases (o. ä.) verteilt; die App verfügt über einen Auto-Update-Mechanismus. Updates sind abwärtskompatibel bzgl. vorhandener Datenbestände.

### Datenhaltung
- Die Daten werden lokal, persistent im betriebssystemkonformen Anwendungsdatenverzeichnis des angemeldeten Benutzers gespeichert; dafür wird aufgrund geringer Leistungsanforderungen, jedoch hoher Anforderungen für die Datenintegrität SQLite genutzt.
- Zur Datenintegrität werden Schema- und Wertevalidierungen (z. B. Pflichtfelder, Feldtypen, zulässige Wertebereiche) durchgesetzt.
- Tagesberichte sind die primäre Speichereinheit; Wochenübersichten werden deterministisch aus den zugehörigen Tagesberichten abgeleitet.
- Ein Stundenplan wird separat gespeichert und bei der Anlage von Tagesberichten regelbasiert berücksichtigt (z. B. Voreinträge für Unterricht/Arbeitszeiten, Plausibilitätsprüfungen bei Abweichungen).
- Datenexport: vollständiger Export/Import der eigenen Daten als maschinenlesbares, dokumentiertes Archivformat (z. B. JSON-basiert) zur Sicherung/Wiederherstellung.
- PDF-Export: Erzeugung formatierter PDF-Dokumente für Berichte/Übersichten.
- Feiertage: optionaler Import von Feiertagen über einen externen Dienst; bei Nichtverfügbarkeit verbleibt die Anwendung voll funktionsfähig (manuelle Pflege möglich).
- Migrationen: Datenbestände tragen eine Schema-Version; bei Updates werden Migrationen ausgeführt. Abwärtskompatibilität wird durch Leser für ältere Schemaversionen sichergestellt.

### Benutzeroberfläche
- Vorformatierung: Auswahl vorformatierter Berichtsvorlagen; optionale Nutzereinstellungen zur Anpassung von Vorformatierungen und Design.
- Interaktionsdesign: Desktop-only; keine mobilen Zielauflösungen erforderlich.
- Die einzelnen Seiten werden über den React Router ausgeliefert.
- Komponenten kommen soweit verfügbar aus Shadcn und werden manuell erweitert.
- Das Styling wird mit Tailwind vorgenommen.

### Geschäftslogik
- Ableitung von Wochenberichten: Wochenübersichten werden konsistent aus den verknüpften Tagesberichten aggregiert.
- Änderungen an Tagesberichten aktualisieren abhängige Aggregationen.
- Regelbasierte Voreinträge aus dem Stundenplan (Unterricht/Arbeitszeiten/Feiertage) mit Möglichkeit zur überschreibbaren Anpassung und Plausibilitätsprüfung.
- Such-/Filterlogik mit kombinierbaren Kriterien (UND/ODER, Zeitraumgrenzen, Textsuche in Tätigkeiten).
- Exportlogik:  
  • Datenexport: komplette Sicherung im Archivformat.  
  • PDF-Export: erzeugt dokumentkonforme Layouts aus Vorlagen.

### Sicherheit
- Authentifizierung über Google Auth, aber die Anmeldung muss auch lokal mit einem Backup-Passwort möglich sein, um der Anforderung nachzukommen, dass die Anwendung auch ohne externe Dienste funktioniert.
- Datenschutz: Es findet nur eine Übertragung an Dritte statt, wenn explizit Google als Anmeldemethode genutzt wird oder die Daten auf Google Drive gesichert werden.
