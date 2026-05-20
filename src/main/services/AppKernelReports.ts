import { AppBootstrapState } from '@/shared/app/bootstrap';
import { AppMetadataSchema } from '@/shared/app/state';
import {
  markBackupDirty,
  registerBackupSuccess,
  registerCloseBackupCheck,
  registerDailyReportForBackup,
  requestManualBackup,
} from '@/shared/backup/policy';
import {
  DeleteDailyReportInput,
  DeleteWeeklyReportInput,
  RegisterWeeklyReportHashInput,
  UpsertDailyReportInput,
  UpsertWeeklyReportInput,
} from '@/shared/ipc/app-api';
import {
  applyDeleteDailyReport,
  applyDeleteWeeklyReport,
  applyUpsertDailyReport,
  applyUpsertWeeklyReport,
  rebuildWeeklyHashByWeeklyReportId,
} from '@/shared/reports/mutations';
import {
  isWeeklyReportSubmitted,
  resolveWeeklyReportSubmissionBlock,
} from '@/shared/reports/edit-locks';
import { WeeklyReportHashRecord } from '@/shared/reports/stable';
import { AppKernelAuthDrive } from '@/main/services/AppKernelAuthDrive';
import { resolveReportStartDateFromSettings } from '@/shared/settings/report-start-date';

function toLocalIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default abstract class AppKernelReports extends AppKernelAuthDrive {
  async requestManualBackup(): Promise<AppBootstrapState> {
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);

      return AppMetadataSchema.parse({
        ...currentState,
        backup: requestManualBackup(currentState.backup),
      });
    });
    const processedState = await this.tryProcessPendingBackup(nextState);

    return this.buildBootstrapState(processedState);
  }

  async recordDailyReport(): Promise<AppBootstrapState> {
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);

      return AppMetadataSchema.parse({
        ...currentState,
        backup: registerDailyReportForBackup(currentState.backup),
      });
    });
    const processedState = await this.tryProcessPendingBackup(nextState);

    return this.buildBootstrapState(processedState);
  }

  async registerBackupSuccess(): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);

      return AppMetadataSchema.parse({
        ...currentState,
        backup: registerBackupSuccess(currentState.backup, now),
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async handleAppClose(): Promise<void> {
    const nextState = await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...currentState,
        backup: registerCloseBackupCheck(currentState.backup),
      }),
    );

    await this.tryProcessPendingBackup(nextState);
  }

  async upsertWeeklyReport(
    input: UpsertWeeklyReportInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);
      const currentWeeklyReport =
        Object.values(currentState.reports.weeklyReports).find(
          (weeklyReport) =>
            weeklyReport.weekStart === input.weekStart &&
            weeklyReport.weekEnd === input.weekEnd,
        ) ?? null;
      const submitsWeeklyReport =
        input.values.submitted === true &&
        !isWeeklyReportSubmitted(currentWeeklyReport);

      if (submitsWeeklyReport) {
        const submissionBlock = resolveWeeklyReportSubmissionBlock({
          reportsState: currentState.reports,
          reportStartDate: resolveReportStartDateFromSettings(
            currentState.settings.current.values,
          ),
          weekStart: input.weekStart,
          weekEnd: input.weekEnd,
          today: toLocalIsoDate(new Date(now)),
        });

        if (submissionBlock) {
          throw new Error('Weekly report cannot be submitted yet.');
        }
      }

      const mutation = applyUpsertWeeklyReport(currentState.reports, {
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
        values: input.values,
        now,
      });

      if (!mutation.changed) {
        return currentState;
      }

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        reports: mutation.reports,
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async deleteWeeklyReport(
    input: DeleteWeeklyReportInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);
      const mutation = applyDeleteWeeklyReport(currentState.reports, {
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
        now,
      });

      if (!mutation.changed) {
        return currentState;
      }

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        reports: mutation.reports,
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async upsertDailyReport(
    input: UpsertDailyReportInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);
      const mutation = applyUpsertDailyReport(currentState.reports, {
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
        date: input.date,
        values: input.values,
        now,
      });

      if (!mutation.changed) {
        return currentState;
      }

      return AppMetadataSchema.parse({
        ...currentState,
        backup: mutation.dailyReportWritten
          ? registerDailyReportForBackup(currentState.backup)
          : markBackupDirty(currentState.backup),
        reports: mutation.reports,
      });
    });
    const processedState = await this.tryProcessPendingBackup(nextState);

    return this.buildBootstrapState(processedState);
  }

  async deleteDailyReport(
    input: DeleteDailyReportInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);
      const mutation = applyDeleteDailyReport(currentState.reports, {
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
        date: input.date,
        now,
      });

      if (!mutation.changed) {
        return currentState;
      }

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        reports: mutation.reports,
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async registerWeeklyReportHash(
    input: RegisterWeeklyReportHashInput,
  ): Promise<WeeklyReportHashRecord> {
    let record: WeeklyReportHashRecord | null = null;

    await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);
      const rebuilt = rebuildWeeklyHashByWeeklyReportId({
        reports: currentState.reports,
        weeklyReportId: input.weeklyReportId,
      });

      if (!rebuilt) {
        throw new Error('Unknown weekly report.');
      }

      record = rebuilt.record;

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        reports: rebuilt.reports,
      });
    });

    if (!record) {
      throw new Error('Weekly report hash could not be registered.');
    }

    return record;
  }
}
