import { useTranslation } from 'react-i18next';

export default function LoginPage() {
  const { t } = useTranslation();
  return <div>{t('login.title')}</div>;
}
