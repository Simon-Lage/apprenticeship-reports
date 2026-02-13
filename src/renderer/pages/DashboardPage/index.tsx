import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthActions } from '../../hooks/useAuthActions';

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status } = useAuth();
  const { reset } = useAuthActions();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleReset = async () => {
    if (!password) {
      setErrorKey('dashboard.errors.passwordRequired');
      return;
    }
    setLoading(true);
    setErrorKey(null);
    try {
      await reset(password);
    } catch (error) {
      setErrorKey('dashboard.errors.generic');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-lg font-semibold">{t('dashboard.title')}</div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reset-password">{t('dashboard.resetPassword')}</Label>
        <Input
          id="reset-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
      </div>
      {errorKey ? (
        <div className="text-sm text-destructive">{t(errorKey)}</div>
      ) : null}
      {!status?.hasGoogle ? (
        <Button
          type="button"
          variant="outline"
          icon={<FcGoogle />}
          onClick={() => navigate('/welcome/setup-google')}
        >
          {t('dashboard.addGoogle')}
        </Button>
      ) : null}
      <Button onClick={handleReset} disabled={loading}>
        {t('dashboard.reset')}
      </Button>
    </div>
  );
}
