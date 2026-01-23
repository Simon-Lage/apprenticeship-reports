import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';

export default function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="text-lg font-semibold">{t('onboarding.title')}</div>
        <div className="text-sm text-muted-foreground">
          {t('onboarding.description')}
        </div>
      </div>
      <Button onClick={() => navigate('/dashboard')}>
        {t('onboarding.next')}
      </Button>
    </div>
  );
}
