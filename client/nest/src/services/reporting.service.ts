import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { REPORT_HISTORY_TTL, REPORT_UPDATE_DELAY_MS, SETTINGS } from '../constants';
import { BeaconSettings } from '../types/beacon-settings.type';
import { getReportKey } from '../helpers';
import { RedisService } from './redis.service';

@Injectable()
export class ReportingService implements OnModuleDestroy {
  private activeReports: Map<string, object> = new Map();

  private throttledUpdates: Map<string, Partial<object>> = new Map();

  private updateTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    @Inject(SETTINGS) private readonly settings: BeaconSettings,
    private readonly redis: RedisService
  ) {}

  async startNewReport<T extends object>(reportName: string, initialValues?: T): Promise<string> {
    const reportId = uuidv4();
    const reportListChannel = getReportKey('list', this.settings);
    this.activeReports.set(reportId, initialValues ?? {});
    const currents = await this.redis.get(reportListChannel);

    const updatedList = {
      ...(currents ?? {}),
      [reportId]: { name: reportName, status: 'running', createdAt: new Date().toISOString() },
    };

    await this.redis.set(reportListChannel, updatedList);
    await this.redis.publish(reportListChannel, updatedList);

    Logger.verbose(`Started new report "${reportName}" with ID ${reportId}`);
    return reportId;
  }

  updateReport<T extends object>(reportId: string, changes: Partial<T>) {
    const report = this.activeReports.get(reportId);
    if (report) {
      this.activeReports.set(reportId, { ...report, ...changes });

      // Accumulate updates locally
      const existingUpdates = this.throttledUpdates.get(reportId) || {};
      this.throttledUpdates.set(reportId, { ...existingUpdates, ...changes });

      // If no timer exists, start one
      if (!this.updateTimers.has(reportId)) {
        this.updateTimers.set(
          reportId,
          setTimeout(() => this.flushUpdates(reportId), REPORT_UPDATE_DELAY_MS)
        );
      }
    } else {
      Logger.error(`Active report with ID ${reportId} not found.`);
    }
  }

  private async flushUpdates(reportId: string) {
    Logger.verbose(`Flushing updates for report ID ${reportId}`);
    const updates = this.throttledUpdates.get(reportId);
    if (updates) {
      this.throttledUpdates.delete(reportId);
      await this.redis.publish(getReportKey(reportId, this.settings), updates);
    }

    // Clear the timer
    this.updateTimers.delete(reportId);
  }

  async finishReport(reportId: string) {
    const report = this.activeReports.get(reportId);
    if (report) {
      // Ensure all updates are flushed before finishing
      await this.flushUpdates(reportId);

      const channel = getReportKey(reportId, this.settings);

      // Move to inactive reports in Redis with TTL
      await this.redis.publish(channel, report, REPORT_HISTORY_TTL);
      this.activeReports.delete(reportId);
      Logger.verbose(`Report ID ${reportId} moved to inactive.`);

      // Notify subscribers that the report is finished
      await this.redis.closeChannel(channel);

      const reportListChannel = getReportKey('list', this.settings);
      let currents = await this.redis.get<Record<string, object>>(reportListChannel);

      if (!currents) {
        Logger.error('No active reports found');
        currents = {};
      }

      const updatedList = {
        ...currents,
        [reportId]: { ...currents[reportId], status: 'finished', finishedAt: new Date().toISOString() },
      };

      await this.redis.set(reportListChannel, updatedList);
      await this.redis.publish(reportListChannel, updatedList);
    } else {
      Logger.error(`Active report with ID ${reportId} not found.`);
    }
  }

  onModuleDestroy() {
    // Clean up any remaining timers to prevent memory leaks
    this.updateTimers.forEach((timer) => clearTimeout(timer));
  }
}
