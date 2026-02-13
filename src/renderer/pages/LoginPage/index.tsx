import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FcGoogle } from 'react-icons/fc';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import LiquidGlassModule from 'liquid-glass-react';
import { Button } from '../../components/ui/button';
import { CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthActions } from '../../hooks/useAuthActions';

type LiquidGlassProps = {
  children: React.ReactNode;
  displacementScale?: number;
  blurAmount?: number;
  saturation?: number;
  aberrationIntensity?: number;
  elasticity?: number;
  cornerRadius?: number;
  className?: string;
  overLight?: boolean;
  mode?: 'standard' | 'polar' | 'prominent' | 'shader';
};

const LiquidGlass = ((
  LiquidGlassModule as unknown as {
    default?: React.ComponentType<LiquidGlassProps>;
  }
).default ??
  (LiquidGlassModule as unknown as React.ComponentType<LiquidGlassProps>)) as React.ComponentType<LiquidGlassProps>;

export default function LoginPage() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const { loginWithPassword, loginWithGoogle } = useAuthActions();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handlePasswordLogin = async () => {
    if (!password) {
      setErrorKey('login.errors.passwordRequired');
      return;
    }
    setPasswordLoading(true);
    setErrorKey(null);
    try {
      await loginWithPassword(password);
    } catch (error) {
      setErrorKey('login.errors.generic');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorKey(null);
    try {
      await loginWithGoogle();
    } catch (error) {
      setErrorKey('login.errors.generic');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <LiquidGlass
      cornerRadius={16}
      mode="prominent"
      displacementScale={72}
      blurAmount={0.095}
      saturation={185}
      aberrationIntensity={1.2}
      elasticity={0.18}
      overLight
      className="w-[min(92vw,28rem)]"
    >
      <CardHeader>
        <CardTitle>{t('login.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t('login.password')}</Label>
          <div className="flex gap-2">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={
                showPassword ? t('login.hidePassword') : t('login.showPassword')
              }
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </Button>
          </div>
        </div>
        {errorKey ? (
          <div className="text-sm text-destructive">{t(errorKey)}</div>
        ) : null}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handlePasswordLogin}
            disabled={passwordLoading || googleLoading}
          >
            {t('login.passwordSubmit')}
          </Button>
          {status?.hasGoogle ? (
            <Button
              type="button"
              variant="outline"
              icon={<FcGoogle />}
              onClick={handleGoogleLogin}
              disabled={passwordLoading || googleLoading}
            >
              {t('login.google')}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </LiquidGlass>
  );
}
