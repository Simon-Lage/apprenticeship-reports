import { SectionCard } from '@/renderer/components/app/SectionCard';

export default function SendWeeklyReportPage() {
  return (
    <SectionCard className="border-primary-tint bg-white">
      <p className="text-sm leading-6 text-text-color/80">
        Anforderungen SendWeeklyReportPage: Diese Seite steuert den finalen
        Versand eines Wochenberichts. Sie zeigt eine Versandvorschau des
        gewählten Wochenberichts, erlaubt die Auswahl bzw. Bestätigung der
        Empfängeradresse, führt einen expliziten Versand-Trigger aus, setzt den
        Wochenbericht danach auf abgeschickt, protokolliert
        Versandzeitpunkt/Status und zeigt klares Feedback bei Erfolg oder
        Fehler. Detail-UI folgt später.
      </p>
    </SectionCard>
  );
}
