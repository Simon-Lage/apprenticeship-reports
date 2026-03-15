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
- Alle UI-Texte müssen aus i18n-Übersetzungen kommen.

---

## UI-Designprinzipien

- Globales UI-Feedback läuft zentral über einen Toast-Controller; Seiten feuern keine uneinheitlichen Einzelmechanismen.
- Es gilt ein gemeinsames Layout-System mit wiederverwendbaren Sections, Feldern und Statusdarstellungen statt seitenweiser Sonderlösungen.
- Navigation erfolgt über eine Topbar im authentifizierten App-Bereich; auf Login und Onboarding ist sie ausgeblendet.
- Farbsteuerung erfolgt zentral über CSS-Variablen und Tailwind-Farbklassen:
  - `primary`
  - `primary-contrast`
  - `primary-shade`
  - `primary-tint`
  - `text-color`
- Alle UI-Flächen, Texte, Borders und States nutzen diese Token-basierten Tailwind-Klassen, damit das Farbschema später global anpassbar bleibt.
- Neue UI-Komponenten werden nur eingeführt, wenn sie mindestens an zwei Stellen sinnvoll wiederverwendbar sind oder Verantwortlichkeiten klar trennen.
- Framer Motion ist die vorgesehene Animationsbibliothek für UI-Motion; Animationen werden konsistent und nicht ad hoc umgesetzt.
- Motion wird gezielt eingesetzt (Transitions, Zustandswechsel, Kontextwechsel) und darf Lesbarkeit/Bedienbarkeit nicht beeinträchtigen.
- Vor dem finalen UI-Polish wird pro Seite geprüft, welche Motion-Patterns sinnvoll sind (Seitenübergänge, aktive Navigation, Panel/Modal-Einblendung, Listenänderungen, Feedback-States).

---

## Endziele

- Anwendung hat verpflichtenden lokalen Passwort-Login und optionalen Google-Login

  - Ein lokales Passwort muss immer eingerichtet sein (nicht optional).
  - Google-Login ist optional als zweite Authentifizierungsmoeglichkeit.
  - Fuer die Authentifizierung reicht entweder Passwort oder Google (nicht beides gleichzeitig notwendig).
  - Beim Login option angemeldet zu bleiben als switch

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
  - `weeks` darf als Array nicht leer sein; jeder Week-Eintrag muss ein valides, nicht-leeres Week-Objekt sein.
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

  - 1. JSON parsen und strikt validieren.
  - 2. Import-Preview erzeugen (Diff/Konflikte).
  - 3. Vor Anwendung einen lokalen Recovery-Snapshot erstellen.
  - 4. Compare-Ansicht anbieten (Git-Diff-artig, nebeneinander, synchrones Scrolling).
  - 5. Übernahme anwenden (pro Konflikt manuell oder automatisch per Timestamp-Regel).
  - 6. Bei Fehlern vollständiger Rollback auf Recovery-Snapshot.
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
  - Register ist kein separater Bereich, sondern Teil des Onboardings.
  - Wenn noch kein lokales Passwort eingerichtet ist, muss das Onboarding auch ohne bestehende Authentifizierung startbar sein.
  - Reihenfolge im Onboarding: zuerst lokales Passwort (Pflicht), danach Google (optional), danach weitere Onboardingdaten.
  - Pflichtfelder im Onboarding umfassen mindestens: Ausbildungszeitraum, Bundesland, Ausbildungsabschnitt/Abteilung und Betreuer-E-Mail.
  - Sobald ein lokales Passwort eingerichtet ist, bleibt die App bis zum Abschluss aller Pflicht-Onboardinginformationen vollständig gesperrt.
  - Bereits vorhandene gültige Onboardinginformationen überspringen die zugehörigen Schritte automatisch; angezeigt werden nur tatsächlich fehlende Schritte.
  - Fehlt später eine zuvor vorhandene Pflichtinformation, muss das Onboarding beim nächsten Appstart nach der Authentifizierung genau für diese fehlende Information erneut starten und die App bis zur Ergänzung gesperrt bleiben.
  - Onboarding enthält einen Pflichtschritt zur Auswahl des Bundeslands (DE-Subdivision-Code), damit Feiertage/Ferien korrekt geladen werden können.
- Bei jedem Wochenbericht der fertig ist, soll mit dem Wochenbericht ein Hash dieses Wochenberichtes gespeichert werden.

- Abwesenheiten:

  - Es gibt eine eigene Abwesenheiten-Seite.
  - Manuelle Abwesenheiten umfassen mindestens Krankheit und Urlaub.
  - Feiertage und Ferien werden automatisch ueber die OpenHolidays API geladen (bundeslandspezifisch).
  - Falls keine lokalen Feiertags-/Ferien-Daten vorhanden sind, werden sie beim App-Start geladen.
  - Danach erfolgt ein Jahres-Refresh einmal pro Jahr am 1. Januar.
  - Feiertage/Ferien aus der API werden lokal gespeichert und in der Abwesenheitsverwaltung angezeigt.
  - Manuelle Feiertags-/Ferieneintraege koennen zusaetzlich angelegt und bearbeitet werden.

- UI-Seitenanforderungen (Planungsstand):
  - Allgemein: Wenn kein lokales Passwort existiert, startet Onboarding direkt; sobald ein lokales Passwort existiert, ist ohne Authentifizierung immer Login vorgeschaltet und die App bis dahin gesperrt.
  - Allgemein: Für den finalen UI-Polish sollen sinnvolle, dezente Framer-Motion-Animationen pro Seite eingeplant und konsistent umgesetzt werden.
  - Navigation: Topbar-Navigation ist im authentifizierten App-Bereich sichtbar und wird auf Login- sowie Onboarding-Seiten ausgeblendet.
  - `ChangeAuthMethodsPage`: Nur authentifiziert erreichbar; lokales Passwort ändern sowie optionales Google-Konto verbinden, wechseln oder hinzufügen, ohne die Pflicht eines lokalen Passworts aufzuheben.
  - `DailyReportPage`: UI strikt abhängig vom Tagestyp; Arbeitstag mit editierbarer Tätigkeitsliste aus searchable Dropdown mit Vorschlägen aus bisherigen gleichartigen Einträgen; freier Tag ohne Inhaltserfassung mit Anzeige des Freigrunds; Schultag mit Stundenplan-Preset und pro Stunde anpassbarem Lehrer/Fach. Wenn bei zwei Stunden gleiches Fach und gleicher Lehrer gelten und nur eine Stunde Inhalt hat, wird dieser für die andere Stunde übernommen. Unterweisungen/betrieblicher Unterricht/sonstige Schulungen sind getrennt von normalen Tätigkeiten erfassbar. Für Schultage und Presets sind bis zu 10 Schulstunden pro Tag zu unterstützen.
  - `AbsencesPage`: Verwaltung manueller Abwesenheiten (Krankheit/Urlaub) sowie Anzeige und Pflege von Feiertags-/Ferieninformationen; inklusive Sync-Status und manueller Synchronisationsmöglichkeit fuer OpenHolidays-Daten.
  - `ExportPage`: Export von Settings oder Reports als JSON entweder lokal über Dateidialog oder nach Google Drive; wenn Google-Konto oder Drive-Rechte fehlen, klare Ursache anzeigen und direkte Möglichkeit zum Nachrüsten anbieten.
  - `HomePage`: Als letzte Seite umsetzen; am Ende kompakte Startübersicht mit wichtigsten Einstiegen und Kennzahlen (z. B. Tagesbericht anlegen, letzter Tagesbericht, Anzahl Tagesberichte).
  - `ImportPage`: Import von Settings oder Reports mit nachvollziehbaren Fehlermeldungen; bei überschreibenden Änderungen immer Git-Diff-artige Vergleichsansicht mit zwei Seiten, synchronem Scrolling und farblicher Differenzmarkierung, nur für tatsächlich unterschiedliche Daten.
  - `LoginPage`: Passwort-Login oder Google-Login; Google-Option ist deaktiviert, wenn kein Google-Konto hinterlegt ist, inklusive Hover-Hinweis.
  - `OnboardingPage`: Erster Schritt Passwort setzen, zweiter Schritt optional Google verknüpfen, weitere Schritte danach; unterbrochenes Onboarding wird fortgesetzt und zeigt nur noch fehlende Schritte.
  - `ReportsOverviewPage`: Lange scrollbare Tagesliste ohne Pagination mit Such-/Filtermöglichkeiten; visuelle Wochenabgrenzung zwischen Sonntag und Montag; pro Woche zusätzliche Felder für gesendet-Status, Empfänger-E-Mail und Abteilung.
  - `SettingsPage`: Anforderungen aus Settings-Spezifikation, erweiterbar um künftige Settings; Settings-Import/-Export bleibt getrennt von Reports-Backups.
  - `TimeTablePage`: Stundenplan mit searchable Lehrer-/Fach-Auswahl; integrierte aufklappbare Konfiguration auf derselben Seite mit zwei getrennten Listen (Lehrer, Fächer) ohne Duplikate; neue Werte können direkt aus Stundenplan- oder Tagesreport-Eingaben übernommen werden und dienen als Presets. Der Stundenplan muss pro Tag bis zu 10 Schulstunden abbilden.
  - `WeeklyReportPage`: Beim Öffnen wird automatisch die nächste offene Woche vorausgewählt (ab Ausbildungsstart oder optionalem Berichtsstartdatum), deren Wochenbericht noch nicht abgeschickt ist. Oberhalb sind nur Ausbildungsabschnitt/Abteilung und eine Betreuer-E-Mail editierbar; Versandstatus wird angezeigt, aber nicht per Switch bearbeitet. Die drei Inhaltsblöcke sind read-only und werden ausschließlich aus den Tagesberichten aggregiert in folgender Reihenfolge: 1) Betriebliche Tätigkeiten 2) Unterweisungen/betrieblicher Unterricht/sonstige Schulungen 3) Berufsschule (Unterrichtsthemen).
  - `SendWeeklyReportPage`: Separate Seite für den Versandfluss eines Wochenberichts; WeeklyReport-Seite verlinkt dorthin per "Wochenbericht senden". Detaillierte UI wird später finalisiert.
  - `WeeklyReportPDFPage`: Vorschau eines einseitigen Weekly-Report-PDF und Export über Dateidialog.




We will always use this password: 1!aA1234
So you can authenticate yourself.
