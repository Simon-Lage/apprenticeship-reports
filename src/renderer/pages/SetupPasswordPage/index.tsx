import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuthActions } from '../../hooks/useAuthActions';

export default function SetupPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { init } = useAuthActions();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const validation = useMemo(() => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const matches = password.length > 0 && password === confirm;
    const allRequirements =
      minLength && hasUpper && hasLower && hasNumber && hasSpecial;
    return { matches, allRequirements };
  }, [password, confirm]);

  const canSubmit =
    validation.allRequirements && validation.matches && !loading;

  const requirementClass = (met: boolean) =>
    showValidationErrors && !met
      ? 'text-xs text-red-400'
      : 'text-xs text-muted-foreground';
  const showRequirementsWarning =
    showValidationErrors && !validation.allRequirements;
  const requirementItems = [
    t('setupPassword.requirements.minLength'),
    t('setupPassword.requirements.uppercase'),
    t('setupPassword.requirements.lowercase'),
    t('setupPassword.requirements.number'),
    t('setupPassword.requirements.special'),
  ];

  const handleSubmit = async () => {
    setShowValidationErrors(true);
    if (!canSubmit) {
      return;
    }
    setLoading(true);
    setErrorKey(null);
    try {
      await init(password);
      navigate('/welcome/setup-google');
    } catch (error) {
      setErrorKey('setupPassword.errors.generic');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="text-lg font-semibold">{t('setupPassword.title')}</div>
        <div className="text-sm text-muted-foreground">
          {t('setupPassword.description')}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t('setupPassword.password')}</Label>
          <div className="flex gap-2">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={
                showPassword
                  ? t('setupPassword.hidePassword')
                  : t('setupPassword.showPassword')
              }
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm">{t('setupPassword.confirm')}</Label>
          <div className="flex gap-2">
            <Input
              id="confirm"
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={
                showConfirm
                  ? t('setupPassword.hidePassword')
                  : t('setupPassword.showPassword')
              }
              onClick={() => setShowConfirm((current) => !current)}
            >
              {showConfirm ? <FiEyeOff /> : <FiEye />}
            </Button>
          </div>
          <div className={requirementClass(validation.matches)}>
            {validation.matches
              ? t('setupPassword.match')
              : t('setupPassword.noMatch')}
          </div>
          {showRequirementsWarning ? (
            <div className="list-disc text-xs text-red-100 bg-red-900/20 rounded-2xl !p-2 w-min">
              <p className="font-semibold whitespace-nowrap">
                {t('setupPassword.requirements.title')}
              </p>
              {requirementItems.map((item) => (
                <span className="whitespace-nowrap" key={item}>
                  {item}
                  <br />
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {errorKey ? (
        <div className="text-sm text-destructive">{t(errorKey)}</div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={loading}>
          {t('setupPassword.submit')}
        </Button>
      </div>
    </div>
  );
}
