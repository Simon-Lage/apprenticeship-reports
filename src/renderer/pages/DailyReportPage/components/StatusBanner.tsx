import { FiLock } from 'react-icons/fi';

export type StatusBannerTone = 'submitted' | 'editing';

export interface StatusBannerData {
  tone: StatusBannerTone;
  icon: typeof FiLock;
  title: string;
  description: string;
  meta: string | null;
}

export interface StatusBannerProps {
  data: StatusBannerData | null;
}

export default function StatusBanner({ data }: StatusBannerProps) {
  if (!data) return null;

  return (
    <div
      className={`mt-4 rounded-2xl border px-4 py-3 ${
        data.tone === 'submitted'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
          : 'border-sky-300 bg-sky-50 text-sky-950'
      }`}
    >
      <div className="flex items-start gap-3">
        <data.icon className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">{data.title}</p>
          <p className="text-sm">{data.description}</p>
          {data.meta ? (
            <p className="text-xs text-current/75">{data.meta}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
