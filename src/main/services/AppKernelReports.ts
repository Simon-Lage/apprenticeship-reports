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
  createWeekIdentity,
  DailyReportRecord,
  DailyReportRecordSchema,
  WeeklyReportRecord,
  WeeklyReportRecordSchema,
} from '@/shared/reports/models';
import { WeeklyReportHashRecord } from '@/shared/reports/stable';
import { AppKernelAuthDrive } from '@/main/services/AppKernelAuthDrive';

function createWeekId(weekStart: string, weekEnd: string): string {
  return `week-${weekStart}-${weekEnd}`;
}

function createDayId(weekId: string, date: string): string {
  return `${weekId}-${date}`;
}

export abstract class AppKernelReports extends AppKernelAuthDrive {
  private findWeeklyReportByIdentity(input: {
    weeklyReports: Record<string, WeeklyReportRecord>;
    weekStart: string;
    weekEnd: string;
  }): WeeklyReportRecord | null {
    const weekIdentity = createWeekIdentity(input.weekStart, input.weekEnd);

    return (
      Object.values(input.weeklyReports).find(
        (weeklyReport) =>
          createWeekIdentity(weeklyReport.weekStart, weeklyReport.weekEnd) ===
          weekIdentity,
      ) ?? null
    );
  }

  private findDailyReportByDate(input: {
    weeklyReport: WeeklyReportRecord;
    dailyReports: Record<string, DailyReportRecord>;
    date: string;
  }): DailyReportRecord | null {
    const dailyReportId = input.weeklyReport.dailyReportIds.find((candidateId) => {
      const dailyReport = input.dailyReports[candidateId];
      return dailyReport?.date === input.date;
    });

    if (!dailyReportId) {
      return null;
    }

    return input.dailyReports[dailyReportId] ?? null;
  }

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
      const weeklyReport = this.findWeeklyReportByIdentity({
        weeklyReports: currentState.reports.weeklyReports,
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
      });
      const weekId = weeklyReport?.id ?? createWeekId(input.weekStart, input.weekEnd);
      const nextWeeklyReport = WeeklyReportRecordSchema.parse({
        id: weekId,
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
        values: input.values,
        dailyReportIds: weeklyReport?.dailyReportIds ?? [],
        createdAt: weeklyReport?.createdAt ?? now,
        updatedAt: now,
      });

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        reports: {
          ...currentState.reports,
          weeklyReports: {
            ...currentState.reports.weeklyReports,
            [nextWeeklyReport.id]: nextWeeklyReport,
          },
        },
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async deleteWeeklyReport(
    input: DeleteWeeklyReportInput,
  ): Promise<AppBootstrapState> {
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);
      const weeklyReport = this.findWeeklyReportByIdentity({
        weeklyReports: currentState.reports.weeklyReports,
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
      });

      if (!weeklyReport) {
        return currentState;
      }

      const nextWeeklyReports = { ...currentState.reports.weeklyReports };
      const nextDailyReports = { ...currentState.reports.dailyReports };
      const nextWeeklyHashes = { ...currentState.reports.weeklyHashes };

      delete nextWeeklyReports[weeklyReport.id];
      delete nextWeeklyHashes[weeklyReport.id];
      weeklyReport.dailyReportIds.forEach((dailyReportId) => {
        delete nextDailyReports[dailyReportId];
      });

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        reports: {
          ...currentState.reports,
          weeklyReports: nextWeeklyReports,
          dailyReports: nextDailyReports,
          weeklyHashes: nextWeeklyHashes,
        },
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async upsertDailyReport(input: UpsertDailyReportInput): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);
      const currentWeeklyReport =
        this.findWeeklyReportByIdentity({
          weeklyReports: currentState.reports.weeklyReports,
          weekStart: input.weekStart,
          weekEnd: input.weekEnd,
        }) ??
        WeeklyReportRecordSchema.parse({
          id: createWeekId(input.weekStart, input.weekEnd),
          weekStart: input.weekStart,
          weekEnd: input.weekEnd,
          values: {},
          dailyReportIds: [],
          createdAt: now,
          updatedAt: now,
        });
      const currentDailyReport = this.findDailyReportByDate({
        weeklyReport: currentWeeklyReport,
        dailyReports: currentState.reports.dailyReports,
        date: input.date,
      });
      const nextDailyReport = DailyReportRecordSchema.parse({
        id: currentDailyReport?.id ?? createDayId(currentWeeklyReport.id, input.date),
        weeklyReportId: currentWeeklyReport.id,
        date: input.date,
        values: input.values,
        createdAt: currentDailyReport?.createdAt ?? now,
        updatedAt: now,
      });
      const nextDailyReportIds = currentWeeklyReport.dailyReportIds.includes(
        nextDailyReport.id,
      )
        ? currentWeeklyReport.dailyReportIds
        : [...currentWeeklyReport.dailyReportIds, nextDailyReport.id];
      const nextWeeklyReport = WeeklyReportRecordSchema.parse({
        ...currentWeeklyReport,
        dailyReportIds: nextDailyReportIds,
        updatedAt: now,
      });

      return AppMetadataSchema.parse({
        ...currentState,
        backup: registerDailyReportForBackup(currentState.backup),
        reports: {
          ...currentState.reports,
          weeklyReports: {
            ...currentState.reports.weeklyReports,
            [nextWeeklyReport.id]: nextWeeklyReport,
          },
          dailyReports: {
            ...currentState.reports.dailyReports,
            [nextDailyReport.id]: nextDailyReport,
          },
        },
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
      const weeklyReport = this.findWeeklyReportByIdentity({
        weeklyReports: currentState.reports.weeklyReports,
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
      });

      if (!weeklyReport) {
        return currentState;
      }

      const dailyReport = this.findDailyReportByDate({
        weeklyReport,
        dailyReports: currentState.reports.dailyReports,
        date: input.date,
      });

      if (!dailyReport) {
        return currentState;
      }

      const nextDailyReports = { ...currentState.reports.dailyReports };
      const nextWeeklyReports = { ...currentState.reports.weeklyReports };
      const nextDailyReportIds = weeklyReport.dailyReportIds.filter(
        (dailyReportId) => dailyReportId !== dailyReport.id,
      );

      delete nextDailyReports[dailyReport.id];
      nextWeeklyReports[weeklyReport.id] = WeeklyReportRecordSchema.parse({
        ...weeklyReport,
        dailyReportIds: nextDailyReportIds,
        updatedAt: now,
      });

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        reports: {
          ...currentState.reports,
          weeklyReports: nextWeeklyReports,
          dailyReports: nextDailyReports,
        },
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async registerWeeklyReportHash(
    input: RegisterWeeklyReportHashInput,
  ): Promise<WeeklyReportHashRecord> {
    const now = this.now();
    const record = this.weeklyReportHashService.createRecord(
      input.weeklyReportId,
      input.payload,
      now,
    );

    await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        reports: {
          ...currentState.reports,
          weeklyHashes: {
            ...currentState.reports.weeklyHashes,
            [record.weeklyReportId]: record,
          },
        },
      });
    });

    return record;
  }
}
