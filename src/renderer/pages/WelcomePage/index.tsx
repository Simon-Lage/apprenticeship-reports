import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiCalendar,
  FiCheckCircle,
  FiFileText,
  FiUploadCloud,
} from 'react-icons/fi';

import { Button } from '@/components/ui/button';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { appRoutes } from '@/renderer/lib/app-routes';
import {
  hasSeenOnboardingWelcome,
  markOnboardingWelcomeSeen,
} from '@/renderer/lib/onboarding-welcome';

export default function WelcomePage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const navigate = useNavigate();

  if (runtime.state.auth.passwordConfigured) {
    return <Navigate to={appRoutes.home} replace />;
  }

  if (hasSeenOnboardingWelcome()) {
    return <Navigate to={appRoutes.onboarding} replace />;
  }

  return (
    <main className="w-full">
      <section className="rounded-2xl border border-primary-tint bg-white p-6 shadow-sm md:p-10">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-shade">
          {t('onboarding.welcome.kicker')}
        </p>
        <h1 className="text-3xl font-semibold text-text-color md:text-4xl">
          {t('onboarding.welcome.title')}
        </h1>
        <p className="mt-4 max-w-3xl text-base text-text-color/80 md:text-lg">
          {t('onboarding.welcome.description')}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={() => {
              markOnboardingWelcomeSeen();
              navigate(appRoutes.onboarding, { replace: true });
            }}
          >
            {t('onboarding.welcome.start')}
          </Button>
        </div>
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-primary-tint bg-white p-5">
          <div className="flex items-center gap-2 text-primary-shade">
            <FiFileText className="size-5" />
            <h2 className="text-lg font-semibold">
              {t('onboarding.welcome.features.dailyTitle')}
            </h2>
          </div>
          <p className="mt-2 text-sm text-text-color/80">
            {t('onboarding.welcome.features.dailyDescription')}
          </p>
        </article>
        <article className="rounded-xl border border-primary-tint bg-white p-5">
          <div className="flex items-center gap-2 text-primary-shade">
            <FiCalendar className="size-5" />
            <h2 className="text-lg font-semibold">
              {t('onboarding.welcome.features.weeklyTitle')}
            </h2>
          </div>
          <p className="mt-2 text-sm text-text-color/80">
            {t('onboarding.welcome.features.weeklyDescription')}
          </p>
        </article>
        <article className="rounded-xl border border-primary-tint bg-white p-5">
          <div className="flex items-center gap-2 text-primary-shade">
            <FiUploadCloud className="size-5" />
            <h2 className="text-lg font-semibold">
              {t('onboarding.welcome.features.syncTitle')}
            </h2>
          </div>
          <p className="mt-2 text-sm text-text-color/80">
            {t('onboarding.welcome.features.syncDescription')}
          </p>
        </article>
        <article className="rounded-xl border border-primary-tint bg-white p-5">
          <div className="flex items-center gap-2 text-primary-shade">
            <FiCheckCircle className="size-5" />
            <h2 className="text-lg font-semibold">
              {t('onboarding.welcome.features.setupTitle')}
            </h2>
          </div>
          <p className="mt-2 text-sm text-text-color/80">
            {t('onboarding.welcome.features.setupDescription')}
          </p>
        </article>
      </section>
    </main>
  );
}
