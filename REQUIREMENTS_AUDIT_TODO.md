# Requirements Audit TODO

Stand: 2026-03-15

## Erfuellungsgrad (Schnellbewertung)

- Auth/Onboarding/Login: ca. 78%
- Backup/Drive/Absences: ca. 72%
- Import/Export/Compare: ca. 76%
- UI-Prinzipien/i18n/Page-Polish: ca. 68%
- Gesamt: ca. 73%

## Punktesystem

- Startwert: **100 Punkte**
- Jede offene Abweichung zieht Punkte ab.
- Wenn ein Punkt behoben ist: Checkbox abhaken und **Abzug auf `0` setzen**.
- Formel: `Aktueller Score = 100 - Summe(offene Abzuege)`

## Offene Punkte

| Status | ID | Abzug | Prioritaet | Bereich | Problem | Evidenz |
|---|---|---:|---|---|---|---|
| [ ] | A1 | 4 | P0 | Auth/Login | Google-Login ist an `drive.connectedAccountEmail` gekoppelt und dadurch als Login-Methode inkonsistent verfuegbar. | `src/renderer/pages/LoginPage/index.tsx`, `src/main/services/AppKernelAuthDrive.ts` |
| [ ] | A2 | 2 | P1 | Auth/Onboarding | Onboarding-Google-Schritt uebernimmt verknuepfte E-Mail nicht verlaesslich, wenn Drive-Account nicht gesetzt ist. | `src/renderer/pages/OnboardingPage/index.tsx`, `src/main/services/AppKernelAuthDrive.ts` |
| [ ] | A3 | 2 | P1 | App-Lock UX | Renderer-Routing beruecksichtigt allgemeine Lock-Reasons nicht explizit; UI kann navigierbar wirken, obwohl Guards blockieren. | `src/renderer/App.tsx`, `src/main/services/AppAccessGuard.ts` |
| [ ] | D1 | 3 | P0 | Drive-Rechte | Pflicht-Rechteabfrage nach Login (wenn Rechte fehlen) passiert nicht automatisch, sondern nur manuell ueber Drive-Connect-Flows. | `src/main/services/AppKernelAuthDrive.ts`, `src/renderer/pages/ExportPage/index.tsx` |
| [ ] | D2 | 1 | P1 | Drive-Rechte | Erklaerungstext fuer Berechtigungen ist nicht als verpflichtender Teil des eigentlichen Consent-Flows verdrahtet. | `src/main/main.ts`, `src/shared/drive/permissions.ts` |
| [ ] | B1 | 2 | P1 | Backup | Pending-Backup vom App-Start wird nach spaeterem Passwort-Login nicht sicher erneut angestossen. | `src/main/services/AppKernelAuthDrive.ts` |
| [ ] | B2 | 1 | P2 | Backup | Manuelles Backup ist API-seitig vorhanden, aber im Renderer aktuell ohne klaren UI-Einstieg. | `src/shared/backup/policy.ts`, `src/main/ipc/registerAppHandlers.ts` |
| [ ] | I1 | 3 | P0 | Settings Import/Export | Export-Struktur weicht von Spezifikation ab (`snapshot` statt `settings`). | `src/shared/settings/schema.ts`, `docs/import-export-spec.md` |
| [ ] | I2 | 2 | P1 | Compare Settings | Externe Diff-Hook ist vorhanden, aber nicht in Settings/Import-Compare integriert. | `src/renderer/hooks/useSettingsComparison.ts`, `src/renderer/pages/SettingsPage/index.tsx` |
| [ ] | I3 | 1 | P2 | Compare Layout | `CompareLayout` mit Sync-Scroll ist vorhanden, wird im produktiven Compare-Flow nicht genutzt. | `src/renderer/layouts/CompareLayout.tsx`, `src/renderer/pages/SettingsPage/index.tsx`, `src/renderer/pages/ImportPage/index.tsx` |
| [ ] | U1 | 2 | P1 | UI Shell | `PageHeader` rendert ohne `action` gar nichts; Titel/Beschreibung entfallen auf vielen Seiten faktisch. | `src/renderer/components/app/PageHeader.tsx` |
| [ ] | U2 | 2 | P1 | SendWeeklyReportPage | Seite ist aktuell Platzhalter statt eigenem Versandfluss gemaess Anforderung. | `src/renderer/pages/SendWeeklyReportPage/index.tsx` |
| [ ] | U3 | 1 | P1 | i18n | Harte UI-Texte statt i18n in `SendWeeklyReportPage`. | `src/renderer/pages/SendWeeklyReportPage/index.tsx`, `src/renderer/i18n/translations/de.ts` |
| [ ] | U4 | 1 | P2 | Design Tokens | `CompareLayout` nutzt `slate-*` statt definierter Farb-Tokens. | `src/renderer/layouts/CompareLayout.tsx`, `src/renderer/globals.css` |
| [ ] | U5 | 1 | P2 | UI-Konsistenz | `WeeklyReportPDFPage` nutzt primaere E-Mail doppelt (sekundaere wird nicht angezeigt). | `src/renderer/pages/WeeklyReportPDFPage/index.tsx` |

## Aktueller Zwischenstand

- Summe offene Abzuege: **28**
- Aktueller Score: **72 / 100**

Hinweis: Der Score ist bewusst streng und priorisiert Spezifikationskonformitaet statt nur "laeuft im Alltag". Fuer ein realistischeres Produkt-Readiness-Scoring koennen P2-Punkte geringer gewichtet werden.
