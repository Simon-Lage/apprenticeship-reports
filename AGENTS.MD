Bitte beachte folgende Punkte:

* Denke **IMMER** extra hart nach!
* **Niemals** Kommentare im Code
* **Immer** auf Verantwortlichkeiten achten
* **Best Practice Only**
* **Niemals** Code duplizieren
* **Immer** auf Lesbarkeit achten
* **Immer** auf Performance achten
* Ein **modernes Design** ist sehr, sehr wichtig!
* Wir nutzen **shadcn** und **tailwindcss** für die UI.
* Wenn es eine fertige component gibt für etwas das du umsetzen willst in shadcn, dann prüfe, ob sie allen Anforderungen entspricht und nutze sie.
* Das soll eine Elektron-React-App sein.
* Unter apprenticeship-reports\src\renderer\components\ui habe ich bereits alle shadcn-compoents importiert, die ich für nötig halte.
* Wir gehen Schritt für Schritt vor.
* Nutzerinputs müssen immer validiert werden.
---

## Endziele
- Anwendung hat Login mit Google
  - Beim Login option angemeldet zu bleiben als switch
  - Alle 30 Tage erneute Authentifizierung

- Verpflichtende Google Drive Anbindung
  - Wenn auf Google Drive zugegriffen wird und Rechte fehlen, sollen diese erfragt werden und die Anwendung ist gesperrt, bis die Rechte erteilt wurden.
  - Es soll direkt nach dem Öffnen geprüft werden, ob die nötigen Rechte vorhanden sind und diese dann abgefragt werden, jedoch nicht vor dem Login!
  - Beim der Frage für die Rechte soll auch erklärt werden, warum diese benötigt werden, nämlich für regelmäßige Backups.

- Lokale Datenbank die gesperrt ist, wenn nicht in Google eingeloggt.

- Regelmäßige Backups der lokalen Datenbank auf Google Drive. Backups in folgenden Fällen, falls es Änderungen gab:
  - Backup nach dem Schreiben des 10ten Tagesberichtes seit dem letzten Backup.
  - Backup beim Schließen der App
  - Beim Öffnen der App, falls es noch vom letzten Verwenden ungespeicherte Änderungen gibt.
  - Er soll sich immer merken, wann das letzte Backup erfolgreich durchgeführt wurde.
  - Backups sollten auch manuell möglich sein.
- Zusätzlich zu den Backups der Daten muss es Möglich sein, die Settings ganz einfach mit einem Klick zu exportieren und zu importieren.
  - Beim Importieren soll gewarnt werden, dass die aktuellen Settings überschrieben werden und dann kommt man in das CompareLayout.tsx, was nichts anderes ist,als ein Layout, dass 2 Seiten ldädt und scrolling Synchronisiert, sodass man die Unterschiede sehen kann. Außerdem soll es den Seiten mitgeben, dass sie im compare mode sind. Die Settings Seite braucht dann eine externe Logik in einem Hook uä, wo dann die beidenb Stände verglichen werden, sodass der hook dann genau zurückgibt, wo es unterschiede gibt, sodass diese settings dann mit einer border markiert werden. desweiteren sollte im compare layout noch immer eien überschrift über jede der beiden seiten sthene, in dem fall das datum.

- Es braucht natürlich auch die Möglichkeit Backups zu importieren. Dabei soll dann nach einem umständlichen aber wichtigen procedere vorgegangen werden, damit keine Daten verloren gehen.
  -

- Diese Anwendung braucht ein Onboarding:
  - Dabei gibt es mehrere Abschnitte, teils mit optionalen Angaben. Alle diese Angaben kann man später noch in den Settings umstellen.
  - Falls das Onboarding gestoppt wird, soll beim nächsten Start der Anwendung wieder dort weitergemacht werden und auf den vorherigen Teilen ist alles vom letzten Mal vorausgefüllt.
  - Jegliche eingabe auch optionale muss validiert werden, bevor weiter gedrückt weren kann und nur valide Eingaben werden gespeichert.
  -
- Bei jedem Wochenbericht der fertig ist, soll mit dem Wochenbericht ein Hash dieses Wochenberichtes gespeichert werden.
