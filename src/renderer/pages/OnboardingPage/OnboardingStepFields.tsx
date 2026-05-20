import { ChangeEvent, Dispatch, SetStateAction, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogle } from 'react-icons/fa';
import { ImageIcon, Trash2, Upload } from 'lucide-react';

import { germanSubdivisions } from '@/shared/absence/german-subdivisions';
import { FormField } from '@/renderer/components/app/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OnboardingStepId } from '@/renderer/pages/OnboardingPage/schema';
import {
  CompanyLogoFileError,
  readTransparentPngLogoFile,
} from '@/renderer/lib/company-logo';

type OnboardingStepFieldsProps = {
  stepId: OnboardingStepId;
  stepValues: Record<string, string>;
  setStepValues: Dispatch<SetStateAction<Record<string, string>>>;
  isPending: boolean;
  isGoogleOauthConfigured: boolean;
  googleAuthorizationUrl: string | null;
  onConnectGoogle: () => void;
  onCancelGoogle: () => void;
};

export default function OnboardingStepFields({
  stepId,
  stepValues,
  setStepValues,
  isPending,
  isGoogleOauthConfigured,
  googleAuthorizationUrl,
  onConnectGoogle,
  onCancelGoogle,
}: OnboardingStepFieldsProps) {
  const { t } = useTranslation();
  const companyLogoInputRef = useRef<HTMLInputElement | null>(null);
  const [companyLogoError, setCompanyLogoError] = useState<string | null>(null);
  const isGoogleLinked = stepValues.linked === 'true';
  const linkedGoogleEmail = stepValues.email?.trim() ?? '';
  const companyLogoDataUrl = stepValues.dataUrl?.trim() ?? '';

  function resolveCompanyLogoError(error: CompanyLogoFileError): string {
    return t(`onboarding.steps.company-logo.errors.${error}`);
  }

  async function handleCompanyLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setCompanyLogoError(null);
    const result = await readTransparentPngLogoFile(file);

    if (!result.ok) {
      setCompanyLogoError(resolveCompanyLogoError(result.error));
      return;
    }

    setStepValues((current) => ({
      ...current,
      dataUrl: result.dataUrl,
    }));
  }

  if (stepId === 'identity') {
    return (
      <>
        <FormField
          id="identity-apprentice-identifier"
          label={t('onboarding.steps.identity.apprenticeIdentifier')}
        >
          <Input
            id="identity-apprentice-identifier"
            inputMode="numeric"
            value={stepValues.apprenticeIdentifier ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                apprenticeIdentifier: event.target.value.replace(/\D+/g, ''),
              }))
            }
          />
        </FormField>
        <FormField
          id="identity-first-name"
          label={t('onboarding.steps.identity.firstName')}
        >
          <Input
            id="identity-first-name"
            value={stepValues.firstName ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                firstName: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField
          id="identity-last-name"
          label={t('onboarding.steps.identity.lastName')}
        >
          <Input
            id="identity-last-name"
            value={stepValues.lastName ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                lastName: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField
          id="identity-profession"
          label={t('onboarding.steps.identity.profession')}
        >
          <Input
            id="identity-profession"
            value={stepValues.profession ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                profession: event.target.value,
              }))
            }
          />
        </FormField>
      </>
    );
  }

  if (stepId === 'training-period') {
    return (
      <>
        <FormField
          id="training-start"
          label={t('onboarding.steps.trainingPeriod.start')}
        >
          <Input
            id="training-start"
            type="date"
            value={stepValues.trainingStart ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                trainingStart: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField
          id="training-end"
          label={t('onboarding.steps.trainingPeriod.end')}
        >
          <Input
            id="training-end"
            type="date"
            value={stepValues.trainingEnd ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                trainingEnd: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField
          id="training-reports-since"
          label={t('onboarding.steps.trainingPeriod.reportsSince')}
          hint={t('onboarding.steps.trainingPeriod.reportsSinceHint')}
        >
          <Input
            id="training-reports-since"
            type="date"
            value={stepValues.reportsSince ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                reportsSince: event.target.value,
              }))
            }
          />
        </FormField>
      </>
    );
  }

  if (stepId === 'workplace') {
    return (
      <>
        <FormField
          id="workplace-department"
          label={t('onboarding.steps.workplace.department')}
        >
          <Input
            id="workplace-department"
            value={stepValues.department ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                department: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField
          id="workplace-email"
          label={t('onboarding.steps.workplace.trainerEmail')}
        >
          <Input
            id="workplace-email"
            type="email"
            value={stepValues.trainerEmail ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                trainerEmail: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField
          id="workplace-ihk"
          label={t('onboarding.steps.workplace.ihkLink')}
        >
          <Input
            id="workplace-ihk"
            type="url"
            value={stepValues.ihkLink ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                ihkLink: event.target.value,
              }))
            }
          />
        </FormField>
      </>
    );
  }

  if (stepId === 'region') {
    return (
      <>
        <Alert className="border-primary-tint bg-primary-tint/20">
          <AlertTitle>{t('onboarding.steps.region.title')}</AlertTitle>
          <AlertDescription>
            {t('onboarding.steps.region.openHolidaysNoticeBefore')}{' '}
            <a
              href="https://www.openholidaysapi.org/de/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {t('onboarding.steps.region.openHolidaysLink')}
            </a>
            {t('onboarding.steps.region.openHolidaysNoticeAfter')}
          </AlertDescription>
        </Alert>
        <FormField
          id="region-subdivision-code"
          label={t('onboarding.steps.region.subdivisionCode')}
        >
          <select
            id="region-subdivision-code"
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            value={stepValues.subdivisionCode ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                subdivisionCode: event.target.value,
              }))
            }
          >
            <option value="">{t('onboarding.steps.region.placeholder')}</option>
            {germanSubdivisions.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {t(`onboarding.steps.region.options.${entry.code}`)}
              </option>
            ))}
          </select>
        </FormField>
      </>
    );
  }

  if (stepId === 'company-logo') {
    return (
      <>
        <Alert className="border-primary-tint bg-primary-tint/20">
          <AlertTitle>
            {t('onboarding.steps.company-logo.optionalTitle')}
          </AlertTitle>
          <AlertDescription>
            {t('onboarding.steps.company-logo.optionalDescription')}
          </AlertDescription>
        </Alert>
        <input
          ref={companyLogoInputRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={handleCompanyLogoChange}
        />
        <div className="rounded-lg border border-primary-tint bg-white p-4">
          {companyLogoDataUrl ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-32 items-center justify-center rounded-md border border-primary-tint bg-primary-tint/10 p-3">
                  <img
                    src={companyLogoDataUrl}
                    alt={t('onboarding.steps.company-logo.previewAlt')}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <p className="text-sm text-text-color/70">
                  {t('onboarding.steps.company-logo.previewText')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  disabledReason={t('common.disabledReasons.pending')}
                  className="border-primary-tint"
                  onClick={() => companyLogoInputRef.current?.click()}
                >
                  <Upload className="size-4" />
                  {t('onboarding.steps.company-logo.change')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  disabledReason={t('common.disabledReasons.pending')}
                  className="border-primary-tint"
                  onClick={() => {
                    setCompanyLogoError(null);
                    setStepValues((current) => ({
                      ...current,
                      dataUrl: '',
                    }));
                  }}
                >
                  <Trash2 className="size-4" />
                  {t('onboarding.steps.company-logo.remove')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm text-text-color/70">
                <span className="flex size-10 items-center justify-center rounded-md bg-primary-tint/25 text-text-color">
                  <ImageIcon className="size-5" />
                </span>
                <span>{t('onboarding.steps.company-logo.empty')}</span>
              </div>
              <Button
                type="button"
                disabled={isPending}
                disabledReason={t('common.disabledReasons.pending')}
                className="bg-primary text-primary-contrast hover:bg-primary-shade"
                onClick={() => companyLogoInputRef.current?.click()}
              >
                <Upload className="size-4" />
                {t('onboarding.steps.company-logo.upload')}
              </Button>
            </div>
          )}
        </div>
        {companyLogoError ? (
          <Alert variant="destructive">
            <AlertDescription>{companyLogoError}</AlertDescription>
          </Alert>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Alert className="border-primary-tint bg-primary-tint/20">
        <AlertTitle>{t('onboarding.steps.google.optionalTitle')}</AlertTitle>
        <AlertDescription>
          {t('onboarding.steps.google.optionalDescription')}
        </AlertDescription>
      </Alert>
      {!isGoogleOauthConfigured ? (
        <Alert className="border-primary-tint bg-primary-tint/35">
          <AlertTitle>
            {t('onboarding.steps.google.unavailableTitle')}
          </AlertTitle>
          <AlertDescription>
            {t('onboarding.steps.google.unavailableDescription')}
          </AlertDescription>
        </Alert>
      ) : null}
      {isGoogleLinked ? (
        <Alert className="border-primary-tint bg-primary-tint/20">
          <AlertTitle>{t('onboarding.steps.google.connectedTitle')}</AlertTitle>
          <AlertDescription>
            {linkedGoogleEmail
              ? t('onboarding.steps.google.connectedDescriptionWithEmail', {
                  email: linkedGoogleEmail,
                })
              : t('onboarding.steps.google.connectedDescription')}
          </AlertDescription>
        </Alert>
      ) : null}
      <p className="text-sm text-text-color/75">
        {t('onboarding.steps.google.browserHint')}
      </p>
      <Button
        type="button"
        disabled={isPending || !isGoogleOauthConfigured}
        disabledReason={
          isPending
            ? t('common.disabledReasons.pending')
            : t('common.disabledReasons.googleOauthUnavailable')
        }
        className="bg-primary text-primary-contrast hover:bg-primary-shade"
        onClick={onConnectGoogle}
      >
        <FaGoogle className="size-4" />
        {isGoogleLinked
          ? t('onboarding.steps.google.switchAccount')
          : t('onboarding.steps.google.connect')}
      </Button>
      {googleAuthorizationUrl ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <a
            href={googleAuthorizationUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('common.googleAuth.manualLink')}
          </a>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-primary-tint"
            onClick={onCancelGoogle}
          >
            {t('common.googleAuth.cancel')}
          </Button>
        </div>
      ) : null}
    </>
  );
}
