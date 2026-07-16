import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ImageIcon, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import { z } from 'zod';

import { FormField } from '@/renderer/components/app/FormField';
import LoadingSpinner from '@/renderer/components/app/LoadingSpinner';
import PasswordInput from '@/renderer/components/app/PasswordInput';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import SettingsBackupScopeSwitches from '@/renderer/components/backup/SettingsBackupScopeSwitches';
import UnsavedChangesDialog from '@/renderer/components/app/UnsavedChangesDialog';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import useUnsavedChangesGuard from '@/renderer/hooks/useUnsavedChangesGuard';
import { useSettingsSnapshot } from '@/renderer/hooks/useKernelData';
import { cn } from '@/renderer/lib/utils';
import {
  mergeOnboardingSettings,
  parseOnboardingCompanyLogo,
  parseOnboardingIdentity,
  parseOnboardingRegion,
  parseOnboardingTrainingPeriod,
  mergeUiSettings,
  parseUiSettings,
  resolveWorkplaceSettingsValues,
  UiSettingsValues,
} from '@/renderer/lib/app-settings';
import { appRoutes } from '@/renderer/lib/app-routes';
import {
  CompanyLogoFileError,
  readTransparentPngLogoFile,
} from '@/renderer/lib/company-logo';
import {
  OnboardingStepId,
  parseOnboardingStepValues,
} from '@/renderer/pages/OnboardingPage/schema';
import { germanSubdivisions } from '@/shared/absence/german-subdivisions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  mergeAbsenceSettings,
  parseAbsenceSettings,
} from '@/shared/absence/settings';
import {
  SettingsBackupScopeValues,
  mergeBackupSettings,
  parseBackupSettings,
} from '@/shared/backup/settings';
import { JsonObject } from '@/shared/common/json';
import {
  IhkOselgbCredentialStatus,
  isIhkOselgbLink,
} from '@/shared/ihk/ihk-oselgb';

type SettingsFormValues = UiSettingsValues & {
  firstName: string;
  lastName: string;
  apprenticeIdentifier: string;
  profession: string;
  trainingStart: string;
  trainingEnd: string;
  reportsSince: string;
  subdivisionCode: string;
  autoSyncHolidays: boolean;
  ihkLink: string;
  reportsEnabled: boolean;
  reportsDailyThreshold: number;
  settingsEnabled: boolean;
  automaticBackupsEncrypted: boolean;
  allowEarlyWeeklyReportSubmission: boolean;
  companyLogoDataUrl: string;
  automaticSettingsScope: SettingsBackupScopeValues;
  manualSettingsScope: SettingsBackupScopeValues;
};

type SettingsFieldKey = keyof SettingsFormValues;

type SettingsFieldErrors = Partial<Record<SettingsFieldKey, string>>;

type ParsedSettingsFormValues = {
  identity: {
    firstName: string;
    lastName: string;
    apprenticeIdentifier: string;
    profession: string;
  };
  trainingPeriod: {
    trainingStart: string;
    trainingEnd: string;
    reportsSince: string | null;
  };
  workplace: {
    department: string;
    trainerEmail: string;
    ihkLink: string | null;
  };
  region: {
    subdivisionCode: string;
    autoSyncHolidays: boolean;
  };
  companyLogo: {
    dataUrl: string | null;
  };
};

const settingsValidationFieldMap: Record<
  Exclude<OnboardingStepId, 'google' | 'company-logo'>,
  Record<string, SettingsFieldKey>
> = {
  identity: {
    firstName: 'firstName',
    lastName: 'lastName',
    apprenticeIdentifier: 'apprenticeIdentifier',
    profession: 'profession',
  },
  'training-period': {
    trainingStart: 'trainingStart',
    trainingEnd: 'trainingEnd',
    reportsSince: 'reportsSince',
  },
  workplace: {
    department: 'defaultDepartment',
    trainerEmail: 'supervisorEmailPrimary',
    ihkLink: 'ihkLink',
  },
  region: {
    subdivisionCode: 'subdivisionCode',
  },
};

function resolveSettingsFormValues(values: JsonObject): SettingsFormValues {
  const parsedUiSettings = parseUiSettings(values);
  const identity = parseOnboardingIdentity(values);
  const trainingPeriod = parseOnboardingTrainingPeriod(values);
  const region = parseOnboardingRegion(values);
  const absence = parseAbsenceSettings(values);
  const workplace = resolveWorkplaceSettingsValues(values);
  const backup = parseBackupSettings(values);
  const companyLogo = parseOnboardingCompanyLogo(values);

  return {
    ...parsedUiSettings,
    firstName: identity.firstName ?? '',
    lastName: identity.lastName ?? '',
    apprenticeIdentifier: identity.apprenticeIdentifier ?? '',
    profession: identity.profession ?? '',
    trainingStart: trainingPeriod.trainingStart ?? '',
    trainingEnd: trainingPeriod.trainingEnd ?? '',
    reportsSince: trainingPeriod.reportsSince ?? '',
    subdivisionCode: region.subdivisionCode ?? '',
    autoSyncHolidays: absence.autoSyncHolidays,
    defaultDepartment: workplace.department,
    supervisorEmailPrimary: workplace.trainerEmail,
    ihkLink: workplace.ihkLink,
    reportsEnabled: backup.reportsEnabled,
    reportsDailyThreshold: backup.reportsDailyThreshold,
    settingsEnabled: backup.settingsEnabled,
    automaticBackupsEncrypted: backup.automaticBackupsEncrypted,
    allowEarlyWeeklyReportSubmission:
      parsedUiSettings.allowEarlyWeeklyReportSubmission,
    companyLogoDataUrl: companyLogo.dataUrl ?? '',
    automaticSettingsScope: backup.automaticSettingsScope,
    manualSettingsScope: backup.manualSettingsScope,
  };
}

function isEmptySettingsFieldValue(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length === 0 : value == null;
}

function resolveSettingsValidationMessage(input: {
  stepId: Exclude<OnboardingStepId, 'google' | 'company-logo'>;
  field: SettingsFieldKey;
  issue: z.ZodIssue;
  formValues: SettingsFormValues;
  t: (key: string) => string;
}): string {
  const code =
    typeof input.issue.message === 'string' ? input.issue.message : '';
  const isEmpty = isEmptySettingsFieldValue(input.formValues[input.field]);

  if (code === 'invalid-range') {
    return input.t('onboarding.steps.trainingPeriod.validationRange');
  }

  if (code === 'invalid-reports-since-range') {
    return input.t(
      'onboarding.steps.trainingPeriod.validationReportsSinceRange',
    );
  }

  if (code === 'invalid-apprentice-identifier') {
    return input.t('onboarding.steps.identity.validationApprenticeIdentifier');
  }

  if (code === 'required-department') {
    return input.t('settings.validation.departmentRequired');
  }

  if (code === 'required-trainer-email') {
    return input.t('settings.validation.trainerEmailRequired');
  }

  if (code === 'invalid-email') {
    return input.t('settings.validation.invalidEmail');
  }

  if (code === 'invalid-url') {
    return input.t('onboarding.steps.workplace.validationUrl');
  }

  if (input.field === 'firstName' && isEmpty) {
    return input.t('settings.validation.firstNameRequired');
  }

  if (input.field === 'lastName' && isEmpty) {
    return input.t('settings.validation.lastNameRequired');
  }

  if (input.field === 'apprenticeIdentifier' && isEmpty) {
    return input.t('settings.validation.apprenticeIdentifierRequired');
  }

  if (input.field === 'profession' && isEmpty) {
    return input.t('settings.validation.professionRequired');
  }

  if (input.field === 'trainingStart' && isEmpty) {
    return input.t('settings.validation.trainingStartRequired');
  }

  if (input.field === 'trainingEnd' && isEmpty) {
    return input.t('settings.validation.trainingEndRequired');
  }

  if (input.field === 'subdivisionCode' && isEmpty) {
    return input.t('settings.validation.subdivisionRequired');
  }

  if (code === 'invalid-subdivision') {
    return input.t('onboarding.steps.region.validationSubdivision');
  }

  return input.t('onboarding.validation.generic');
}

function collectSettingsStepErrors(input: {
  stepId: Exclude<OnboardingStepId, 'google' | 'company-logo'>;
  error: z.ZodError;
  formValues: SettingsFormValues;
  fieldErrors: SettingsFieldErrors;
  t: (key: string) => string;
}) {
  input.error.issues.forEach((issue) => {
    const fieldName = String(issue.path[0] ?? '');
    const field = settingsValidationFieldMap[input.stepId][fieldName];

    if (!field || input.fieldErrors[field]) {
      return;
    }

    input.fieldErrors[field] = resolveSettingsValidationMessage({
      stepId: input.stepId,
      field,
      issue,
      formValues: input.formValues,
      t: input.t,
    });
  });
}

function parseSettingsFormValues(input: {
  formValues: SettingsFormValues;
  t: (key: string) => string;
}): {
  fieldErrors: SettingsFieldErrors;
  parsed: ParsedSettingsFormValues | null;
} {
  const fieldErrors: SettingsFieldErrors = {};
  const parsed = {} as ParsedSettingsFormValues;

  const parseStep = <T,>(
    stepId: Exclude<OnboardingStepId, 'google' | 'company-logo'>,
    values: JsonObject,
    assign: (value: T) => void,
  ) => {
    try {
      assign(parseOnboardingStepValues(stepId, values) as T);
    } catch (error) {
      if (error instanceof z.ZodError) {
        collectSettingsStepErrors({
          stepId,
          error,
          formValues: input.formValues,
          fieldErrors,
          t: input.t,
        });
        return;
      }

      throw error;
    }
  };

  parseStep<ParsedSettingsFormValues['identity']>(
    'identity',
    {
      firstName: input.formValues.firstName,
      lastName: input.formValues.lastName,
      apprenticeIdentifier: input.formValues.apprenticeIdentifier,
      profession: input.formValues.profession,
    },
    (value) => {
      parsed.identity = value;
    },
  );
  parseStep<ParsedSettingsFormValues['trainingPeriod']>(
    'training-period',
    {
      trainingStart: input.formValues.trainingStart,
      trainingEnd: input.formValues.trainingEnd,
      reportsSince: input.formValues.reportsSince,
    },
    (value) => {
      parsed.trainingPeriod = value;
    },
  );
  parseStep<ParsedSettingsFormValues['workplace']>(
    'workplace',
    {
      department: input.formValues.defaultDepartment,
      trainerEmail: input.formValues.supervisorEmailPrimary,
      ihkLink: input.formValues.ihkLink,
    },
    (value) => {
      parsed.workplace = value;
    },
  );
  parseStep<ParsedSettingsFormValues['region']>(
    'region',
    {
      subdivisionCode: input.formValues.subdivisionCode,
      autoSyncHolidays: input.formValues.autoSyncHolidays,
    },
    (value) => {
      parsed.region = value;
    },
  );
  try {
    parsed.companyLogo = parseOnboardingStepValues('company-logo', {
      dataUrl: input.formValues.companyLogoDataUrl,
    }) as ParsedSettingsFormValues['companyLogo'];
  } catch (error) {
    if (error instanceof z.ZodError) {
      fieldErrors.companyLogoDataUrl = input.t(
        'settings.companyLogo.errors.invalid',
      );
    } else {
      throw error;
    }
  }

  return {
    fieldErrors,
    parsed: Object.keys(fieldErrors).length ? null : parsed,
  };
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const settingsSnapshot = useSettingsSnapshot();
  const companyLogoInputRef = useRef<HTMLInputElement | null>(null);
  const [formValues, setFormValues] = useState<SettingsFormValues | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SettingsFieldErrors>({});
  const [isPending, setIsPending] = useState(false);
  const [ihkCredentialStatus, setIhkCredentialStatus] =
    useState<IhkOselgbCredentialStatus | null>(null);
  const [ihkPassword, setIhkPassword] = useState('');
  const [isIhkPasswordPending, setIsIhkPasswordPending] = useState(false);
  const baselineFormValues = settingsSnapshot.value
    ? resolveSettingsFormValues(settingsSnapshot.value.values)
    : null;
  const isDirty =
    Boolean(formValues) &&
    Boolean(baselineFormValues) &&
    JSON.stringify(formValues) !== JSON.stringify(baselineFormValues);
  let formActionDisabledReason: string | undefined;

  if (isPending) {
    formActionDisabledReason = t('common.disabledReasons.pending');
  } else if (!isDirty) {
    formActionDisabledReason = t('common.disabledReasons.noChanges');
  }

  useEffect(() => {
    if (!settingsSnapshot.value) {
      return;
    }

    setFormValues(resolveSettingsFormValues(settingsSnapshot.value.values));
    setFieldErrors({});
  }, [settingsSnapshot.value]);

  useEffect(() => {
    let cancelled = false;

    if (!runtime.api) {
      return undefined;
    }

    runtime.api
      .getIhkOselgbCredentialStatus()
      .then((status) => {
        if (!cancelled) {
          setIhkCredentialStatus(status);
        }
        return undefined;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [runtime.api]);

  function updateFormValue<K extends SettingsFieldKey>(
    key: K,
    value: SettingsFormValues[K],
  ) {
    setFormValues((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };

      delete next[key];
      return next;
    });
  }

  function getFieldInputClassName(key: SettingsFieldKey, className?: string) {
    return cn(
      className,
      fieldErrors[key] &&
        'border-destructive focus-visible:ring-destructive/40',
    );
  }

  function resolveCompanyLogoError(error: CompanyLogoFileError): string {
    return t(`settings.companyLogo.errors.${error}`);
  }

  async function handleCompanyLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const result = await readTransparentPngLogoFile(file);

    if (!result.ok) {
      toast.error(
        t('settings.companyLogo.errors.title'),
        resolveCompanyLogoError(result.error),
      );
      return;
    }

    updateFormValue('companyLogoDataUrl', result.dataUrl);
  }

  async function saveIhkPassword() {
    if (!runtime.api || !ihkPassword.trim()) {
      return;
    }

    try {
      setIsIhkPasswordPending(true);
      const status = await runtime.api.setIhkOselgbPassword({
        password: ihkPassword,
      });
      setIhkCredentialStatus(status);
      setIhkPassword('');
      toast.success(t('settings.ihkExperimental.feedback.saved'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('settings.ihkExperimental.feedback.saveError'), message);
    } finally {
      setIsIhkPasswordPending(false);
    }
  }

  async function clearIhkPassword() {
    if (!runtime.api) {
      return;
    }

    try {
      setIsIhkPasswordPending(true);
      const status = await runtime.api.clearIhkOselgbPassword();
      setIhkCredentialStatus(status);
      setIhkPassword('');
      toast.success(t('settings.ihkExperimental.feedback.removed'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('settings.ihkExperimental.feedback.removeError'), message);
    } finally {
      setIsIhkPasswordPending(false);
    }
  }

  async function saveSettings() {
    if (!runtime.api || !settingsSnapshot.value || !formValues) {
      return false;
    }

    const validation = parseSettingsFormValues({
      formValues,
      t,
    });

    if (!validation.parsed) {
      setFieldErrors(validation.fieldErrors);
      toast.error(
        t('settings.feedback.saveError'),
        Object.values(validation.fieldErrors)[0] ??
          t('onboarding.validation.generic'),
      );
      return false;
    }

    try {
      setIsPending(true);
      setFieldErrors({});
      const { identity, trainingPeriod, workplace, region, companyLogo } =
        validation.parsed;
      const nextUiSettings: UiSettingsValues = {
        defaultDepartment: workplace.department,
        supervisorEmailPrimary: workplace.trainerEmail,
        allowEarlyWeeklyReportSubmission:
          formValues.allowEarlyWeeklyReportSubmission,
        teachers: formValues.teachers,
        subjects: formValues.subjects,
        timetable: formValues.timetable,
        schoolDays: formValues.schoolDays,
        textSuggestions: formValues.textSuggestions,
      };
      const withUiSettings = mergeUiSettings(
        settingsSnapshot.value.values,
        nextUiSettings,
      );
      const absence = parseAbsenceSettings(settingsSnapshot.value.values);
      const mergedWithBackup = mergeBackupSettings(
        mergeAbsenceSettings(withUiSettings, {
          ...absence,
          autoSyncHolidays: formValues.autoSyncHolidays,
        }),
        {
          reportsEnabled: formValues.reportsEnabled,
          reportsDailyThreshold: formValues.reportsDailyThreshold,
          settingsEnabled: formValues.settingsEnabled,
          automaticBackupsEncrypted: formValues.automaticBackupsEncrypted,
          automaticSettingsScope: formValues.automaticSettingsScope,
          manualSettingsScope: formValues.manualSettingsScope,
        },
      );
      const mergedSettings = mergeOnboardingSettings({
        values: mergedWithBackup,
        identity: {
          firstName: identity.firstName,
          lastName: identity.lastName,
          apprenticeIdentifier: identity.apprenticeIdentifier,
          profession: identity.profession,
        },
        trainingPeriod: {
          trainingStart: trainingPeriod.trainingStart,
          trainingEnd: trainingPeriod.trainingEnd,
          reportsSince: trainingPeriod.reportsSince,
        },
        workplace: {
          department: workplace.department,
          trainerEmail: workplace.trainerEmail,
          ihkLink: workplace.ihkLink,
        },
        region: {
          subdivisionCode: region.subdivisionCode,
          autoSyncHolidays: region.autoSyncHolidays,
        },
        companyLogo,
      });

      await runtime.api.setSettingsValues(mergedSettings);
      await runtime.refresh();
      await settingsSnapshot.refresh();
      toast.success(t('settings.feedback.saved'));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const code = error.issues[0]?.message;

        if (code === 'invalid-range') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.trainingPeriod.validationRange'),
          );
        } else if (code === 'invalid-reports-since-range') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.trainingPeriod.validationReportsSinceRange'),
          );
        } else if (code === 'invalid-subdivision') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.region.validationSubdivision'),
          );
        } else if (code === 'invalid-apprentice-identifier') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.identity.validationApprenticeIdentifier'),
          );
        } else if (code === 'required-department') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.workplace.validationDepartmentRequired'),
          );
        } else if (code === 'required-trainer-email') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.workplace.validationTrainerEmailRequired'),
          );
        } else if (code === 'invalid-email') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.workplace.validationEmail'),
          );
        } else if (code === 'invalid-url') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.workplace.validationUrl'),
          );
        } else {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.validation.generic'),
          );
        }

        return false;
      }

      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('settings.feedback.saveError'), message);
      return false;
    } finally {
      setIsPending(false);
    }
  }

  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    onSave: async () => saveSettings(),
  });

  if (!formValues) {
    return (
      <Alert className="border-primary-tint bg-primary-tint/30">
        <AlertTitle className="flex items-center gap-2">
          <LoadingSpinner className="size-4" />
          {t('settings.loadingTitle')}
        </AlertTitle>
        <AlertDescription>{t('settings.loadingDescription')}</AlertDescription>
      </Alert>
    );
  }

  const ihkLinkSupported = isIhkOselgbLink(formValues.ihkLink);
  const ihkExperimentalActive = Boolean(
    ihkLinkSupported && ihkCredentialStatus?.passwordConfigured,
  );
  let ihkExperimentalStatusText = t('settings.ihkExperimental.inactiveLink');
  let ihkPasswordSaveDisabledReason: string | undefined;

  if (ihkExperimentalActive) {
    ihkExperimentalStatusText = t('settings.ihkExperimental.active');
  } else if (ihkLinkSupported) {
    ihkExperimentalStatusText = t('settings.ihkExperimental.inactivePassword');
  }

  if (isIhkPasswordPending) {
    ihkPasswordSaveDisabledReason = t('common.disabledReasons.pending');
  } else if (!runtime.api) {
    ihkPasswordSaveDisabledReason = t(
      'common.disabledReasons.runtimeUnavailable',
    );
  } else if (!ihkCredentialStatus) {
    ihkPasswordSaveDisabledReason = t('common.disabledReasons.loading');
  } else if (!ihkCredentialStatus.encryptionAvailable) {
    ihkPasswordSaveDisabledReason = t(
      'settings.ihkExperimental.disabled.secureStorageUnavailable',
    );
  } else if (!ihkPassword.trim()) {
    ihkPasswordSaveDisabledReason = t(
      'settings.ihkExperimental.disabled.passwordMissing',
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard className="border-primary-tint bg-white">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            id="first-name"
            label={t('onboarding.steps.identity.firstName')}
            error={fieldErrors.firstName}
          >
            <Input
              id="first-name"
              aria-invalid={Boolean(fieldErrors.firstName)}
              className={getFieldInputClassName('firstName')}
              value={formValues.firstName}
              onChange={(event) =>
                updateFormValue('firstName', event.target.value)
              }
            />
          </FormField>
          <FormField
            id="last-name"
            label={t('onboarding.steps.identity.lastName')}
            error={fieldErrors.lastName}
          >
            <Input
              id="last-name"
              aria-invalid={Boolean(fieldErrors.lastName)}
              className={getFieldInputClassName('lastName')}
              value={formValues.lastName}
              onChange={(event) =>
                updateFormValue('lastName', event.target.value)
              }
            />
          </FormField>
          <FormField
            id="apprentice-identifier"
            label={t('settings.general.apprenticeIdentifier')}
            error={fieldErrors.apprenticeIdentifier}
          >
            <Input
              id="apprentice-identifier"
              inputMode="numeric"
              aria-invalid={Boolean(fieldErrors.apprenticeIdentifier)}
              className={getFieldInputClassName('apprenticeIdentifier')}
              value={formValues.apprenticeIdentifier}
              onChange={(event) =>
                updateFormValue(
                  'apprenticeIdentifier',
                  event.target.value.replace(/\D+/g, ''),
                )
              }
            />
          </FormField>
          <FormField
            id="profession"
            label={t('settings.general.profession')}
            error={fieldErrors.profession}
          >
            <Input
              id="profession"
              aria-invalid={Boolean(fieldErrors.profession)}
              className={getFieldInputClassName('profession')}
              value={formValues.profession}
              onChange={(event) =>
                updateFormValue('profession', event.target.value)
              }
            />
          </FormField>
          <FormField
            id="department"
            label={t('settings.general.department')}
            error={fieldErrors.defaultDepartment}
          >
            <Input
              id="department"
              aria-invalid={Boolean(fieldErrors.defaultDepartment)}
              className={getFieldInputClassName('defaultDepartment')}
              value={formValues.defaultDepartment}
              onChange={(event) =>
                updateFormValue('defaultDepartment', event.target.value)
              }
            />
          </FormField>
          <FormField
            id="supervisor-1"
            label={t('settings.general.supervisorPrimary')}
            error={fieldErrors.supervisorEmailPrimary}
          >
            <Input
              id="supervisor-1"
              type="email"
              aria-invalid={Boolean(fieldErrors.supervisorEmailPrimary)}
              className={getFieldInputClassName('supervisorEmailPrimary')}
              value={formValues.supervisorEmailPrimary}
              onChange={(event) =>
                updateFormValue('supervisorEmailPrimary', event.target.value)
              }
            />
          </FormField>
          <FormField
            id="ihk-link"
            label={t('settings.general.ihkLink')}
            error={fieldErrors.ihkLink}
          >
            <Input
              id="ihk-link"
              type="url"
              aria-invalid={Boolean(fieldErrors.ihkLink)}
              className={getFieldInputClassName('ihkLink')}
              value={formValues.ihkLink}
              onChange={(event) =>
                updateFormValue('ihkLink', event.target.value)
              }
            />
          </FormField>
          <FormField
            id="google-account"
            label={t('settings.general.googleAccount')}
          >
            <div className="flex min-h-9 items-center gap-3">
              <span className="text-sm font-medium text-text-color/80">
                {runtime.state.drive.connectedAccountEmail ??
                  t('authMethods.google.notLinked')}
              </span>
              {!runtime.state.drive.connectedAccountEmail ? (
                <Link
                  to={appRoutes.changeAuthMethods}
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  {t('settings.general.linkGoogleAccount')}
                </Link>
              ) : null}
            </div>
          </FormField>
        </div>
      </SectionCard>
      {ihkLinkSupported ? (
        <SectionCard
          title={t('settings.ihkExperimental.title')}
          description={t('settings.ihkExperimental.description')}
          className="border-amber-300 bg-white"
        >
          <div className="space-y-4">
            <Alert className="border-amber-300 bg-amber-50 text-amber-950">
              <AlertTitle>
                {t('settings.ihkExperimental.warningTitle')}
              </AlertTitle>
              <AlertDescription>
                {t('settings.ihkExperimental.warningDescription')}
              </AlertDescription>
            </Alert>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <FormField
                id="ihk-oselgb-password"
                label={t('settings.ihkExperimental.passwordLabel')}
                hint={
                  ihkCredentialStatus?.passwordConfigured
                    ? t('settings.ihkExperimental.passwordConfigured')
                    : t('settings.ihkExperimental.passwordNotConfigured')
                }
              >
                <PasswordInput
                  id="ihk-oselgb-password"
                  value={ihkPassword}
                  autoComplete="off"
                  disabled={isIhkPasswordPending}
                  placeholder={t(
                    'settings.ihkExperimental.passwordPlaceholder',
                  )}
                  onChange={(event) => setIhkPassword(event.target.value)}
                  showLabel={t('common.password.show')}
                  hideLabel={t('common.password.hide')}
                />
              </FormField>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button
                  type="button"
                  disabled={Boolean(ihkPasswordSaveDisabledReason)}
                  disabledReason={ihkPasswordSaveDisabledReason}
                  className="bg-primary text-primary-contrast hover:bg-primary-shade"
                  onClick={() => {
                    saveIhkPassword().catch(() => undefined);
                  }}
                >
                  <Save className="size-4" />
                  {ihkCredentialStatus?.passwordConfigured
                    ? t('settings.ihkExperimental.updatePassword')
                    : t('settings.ihkExperimental.savePassword')}
                </Button>
                {ihkCredentialStatus?.passwordConfigured ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isIhkPasswordPending || !runtime.api}
                    disabledReason={
                      isIhkPasswordPending
                        ? t('common.disabledReasons.pending')
                        : t('common.disabledReasons.runtimeUnavailable')
                    }
                    className="border-primary-tint"
                    onClick={() => {
                      clearIhkPassword().catch(() => undefined);
                    }}
                  >
                    <Trash2 className="size-4" />
                    {t('settings.ihkExperimental.removePassword')}
                  </Button>
                ) : null}
              </div>
            </div>
            <p
              className={cn(
                'text-sm font-medium',
                ihkExperimentalActive ? 'text-emerald-700' : 'text-amber-800',
              )}
            >
              {ihkExperimentalStatusText}
            </p>
          </div>
        </SectionCard>
      ) : null}
      <SectionCard
        title={t('settings.companyLogo.title')}
        className="border-primary-tint bg-white"
      >
        <input
          ref={companyLogoInputRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={handleCompanyLogoChange}
        />
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-text-color/70">
              {t('settings.companyLogo.notice')}
            </p>
            {fieldErrors.companyLogoDataUrl ? (
              <p className="text-sm text-destructive">
                {fieldErrors.companyLogoDataUrl}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button
              type="button"
              disabled={isPending}
              disabledReason={t('common.disabledReasons.pending')}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => companyLogoInputRef.current?.click()}
            >
              <Upload className="size-4" />
              {formValues.companyLogoDataUrl
                ? t('settings.companyLogo.change')
                : t('settings.companyLogo.upload')}
            </Button>
            {formValues.companyLogoDataUrl ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                disabledReason={t('common.disabledReasons.pending')}
                className="border-primary-tint"
                onClick={() => updateFormValue('companyLogoDataUrl', '')}
              >
                <Trash2 className="size-4" />
                {t('settings.companyLogo.remove')}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex h-28 items-center justify-center rounded-lg border border-primary-tint bg-primary-tint/10 p-4">
          {formValues.companyLogoDataUrl ? (
            <img
              src={formValues.companyLogoDataUrl}
              alt={t('settings.companyLogo.previewAlt')}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex items-center gap-2 text-sm text-text-color/65">
              <ImageIcon className="size-5" />
              <span>{t('settings.companyLogo.empty')}</span>
            </div>
          )}
        </div>
      </SectionCard>
      <SectionCard
        title={t('settings.trainingPeriod.title')}
        className="border-primary-tint bg-white"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            id="training-start"
            label={t('settings.trainingPeriod.start')}
            error={fieldErrors.trainingStart}
          >
            <Input
              id="training-start"
              type="date"
              aria-invalid={Boolean(fieldErrors.trainingStart)}
              className={getFieldInputClassName('trainingStart')}
              value={formValues.trainingStart}
              onChange={(event) =>
                updateFormValue('trainingStart', event.target.value)
              }
            />
          </FormField>
          <FormField
            id="training-end"
            label={t('settings.trainingPeriod.end')}
            error={fieldErrors.trainingEnd}
          >
            <Input
              id="training-end"
              type="date"
              aria-invalid={Boolean(fieldErrors.trainingEnd)}
              className={getFieldInputClassName('trainingEnd')}
              value={formValues.trainingEnd}
              onChange={(event) =>
                updateFormValue('trainingEnd', event.target.value)
              }
            />
          </FormField>
          <FormField
            id="reports-since"
            label={t('settings.trainingPeriod.reportsSince')}
            error={fieldErrors.reportsSince}
          >
            <Input
              id="reports-since"
              type="date"
              aria-invalid={Boolean(fieldErrors.reportsSince)}
              className={getFieldInputClassName('reportsSince')}
              value={formValues.reportsSince}
              onChange={(event) =>
                updateFormValue('reportsSince', event.target.value)
              }
            />
          </FormField>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-text-color/70">
          {t('settings.trainingPeriod.reportsSinceExplanation')}
        </p>
      </SectionCard>
      <SectionCard
        title={t('settings.region.title')}
        className="border-primary-tint bg-white"
      >
        <div className="mb-5 text-sm leading-relaxed text-text-color/75">
          <p>
            {t('settings.region.openHolidaysNoticeBefore')}{' '}
            <a
              href="https://www.openholidaysapi.org/de/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {t('settings.region.openHolidaysLink')}
            </a>
            {t('settings.region.openHolidaysNoticeAfter')}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            id="region-subdivision"
            label={t('settings.region.subdivisionCode')}
            error={fieldErrors.subdivisionCode}
          >
            <select
              id="region-subdivision"
              aria-invalid={Boolean(fieldErrors.subdivisionCode)}
              className={getFieldInputClassName(
                'subdivisionCode',
                'border-input bg-background h-9 w-full rounded-md border px-3 text-sm',
              )}
              value={formValues.subdivisionCode}
              onChange={(event) =>
                updateFormValue('subdivisionCode', event.target.value)
              }
            >
              <option value="">{t('settings.region.placeholder')}</option>
              {germanSubdivisions.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {t(`onboarding.steps.region.options.${entry.code}`)}
                </option>
              ))}
            </select>
          </FormField>
          <div className="flex flex-col justify-center space-y-1">
            <label
              htmlFor="auto-sync-holidays"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t('settings.region.autoSyncHolidays')}
            </label>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-sync-holidays"
                checked={formValues.autoSyncHolidays}
                onCheckedChange={(checked) =>
                  setFormValues((current) =>
                    current
                      ? { ...current, autoSyncHolidays: checked }
                      : current,
                  )
                }
              />
              <span className="text-sm text-text-color/70">
                {t('settings.region.autoSyncDescription')}
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t('settings.backup.title')}
        className="border-primary-tint bg-white"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col space-y-1">
            <label
              htmlFor="reports-enabled"
              className="text-sm font-medium leading-none"
            >
              {t('settings.backup.reportsEnabled')}
            </label>
            <div className="flex items-center space-x-2 mt-2">
              <Switch
                id="reports-enabled"
                checked={formValues.reportsEnabled}
                onCheckedChange={(checked) =>
                  setFormValues((current) =>
                    current ? { ...current, reportsEnabled: checked } : current,
                  )
                }
              />
            </div>
          </div>
          <FormField
            id="reports-daily-threshold"
            label={t('settings.backup.reportsDailyThreshold')}
          >
            <Input
              id="reports-daily-threshold"
              type="number"
              min={1}
              max={100}
              value={formValues.reportsDailyThreshold}
              onChange={(event) =>
                setFormValues((current) =>
                  current
                    ? {
                        ...current,
                        reportsDailyThreshold:
                          parseInt(event.target.value, 10) || 10,
                      }
                    : current,
                )
              }
            />
          </FormField>

          <div className="flex flex-col space-y-1">
            <label
              htmlFor="automatic-backups-encrypted"
              className="text-sm font-medium leading-none"
            >
              {t('settings.backup.automaticBackupsEncrypted')}
            </label>
            <div className="flex items-center space-x-2 mt-2">
              <Switch
                id="automatic-backups-encrypted"
                checked={formValues.automaticBackupsEncrypted}
                onCheckedChange={(checked) =>
                  setFormValues((current) =>
                    current
                      ? { ...current, automaticBackupsEncrypted: checked }
                      : current,
                  )
                }
              />
              <span className="text-sm text-text-color/70">
                {t('settings.backup.automaticBackupsEncryptedDescription')}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-4 md:col-span-2">
            <div className="flex flex-col space-y-1">
              <label
                htmlFor="settings-enabled"
                className="text-sm font-medium leading-none"
              >
                {t('settings.backup.settingsEnabled')}
              </label>
              <div className="flex items-center space-x-2 mt-2">
                <Switch
                  id="settings-enabled"
                  checked={formValues.settingsEnabled}
                  onCheckedChange={(checked) =>
                    setFormValues((current) =>
                      current
                        ? { ...current, settingsEnabled: checked }
                        : current,
                    )
                  }
                />
              </div>
            </div>

            {formValues.settingsEnabled ? (
              <div className="ml-4">
                <SettingsBackupScopeSwitches
                  value={formValues.automaticSettingsScope}
                  onChange={(automaticSettingsScope) =>
                    setFormValues((current) =>
                      current
                        ? { ...current, automaticSettingsScope }
                        : current,
                    )
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t('settings.earlyWeeklySubmission.title')}
        description={t('settings.earlyWeeklySubmission.description')}
        className="border-amber-300 bg-amber-50"
      >
        <div className="space-y-3">
          <Alert className="border-amber-300 bg-white text-amber-950">
            <AlertTitle>
              {t('settings.earlyWeeklySubmission.warningTitle')}
            </AlertTitle>
            <AlertDescription>
              {t('settings.earlyWeeklySubmission.warningDescription')}
            </AlertDescription>
          </Alert>
          <div className="flex items-center gap-3">
            <Switch
              id="allow-early-weekly-report-submission"
              checked={formValues.allowEarlyWeeklyReportSubmission}
              onCheckedChange={(checked) =>
                setFormValues((current) =>
                  current
                    ? { ...current, allowEarlyWeeklyReportSubmission: checked }
                    : current,
                )
              }
            />
            <label
              htmlFor="allow-early-weekly-report-submission"
              className="text-sm font-medium"
            >
              {t('settings.earlyWeeklySubmission.allow')}
            </label>
          </div>
        </div>
      </SectionCard>

      <div className="sticky bottom-0 z-20 rounded-xl border border-primary-tint/75 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !isDirty}
              disabledReason={formActionDisabledReason}
              className="border-primary-tint"
              onClick={() => {
                if (baselineFormValues) {
                  setFormValues(baselineFormValues);
                  setFieldErrors({});
                  toast.info(t('settings.reset'));
                }
              }}
            >
              <RotateCcw className="size-4" />
              {t('settings.reset')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={isPending || !isDirty}
              disabledReason={formActionDisabledReason}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => {
                saveSettings().catch(() => undefined);
              }}
            >
              <Save className="size-4" />
              {isPending ? t('common.loading') : t('settings.save')}
            </Button>
          </div>
        </div>
      </div>
      <UnsavedChangesDialog
        open={unsavedChangesGuard.isOpen}
        isPending={unsavedChangesGuard.isPending}
        onCancel={unsavedChangesGuard.cancel}
        onDiscard={unsavedChangesGuard.discard}
        onSave={() => {
          unsavedChangesGuard.saveAndProceed().catch(() => undefined);
        }}
      />
    </div>
  );
}
