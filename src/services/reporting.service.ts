import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { RedisModifiers } from '@/enums';
import { REPORT_HISTORY_TTL, REPORT_UPDATE_DELAY_MS } from '@/constants';

@Injectable()
export class ReportingService implements OnModuleDestroy {
  private activeReports: Map<string, object> = new Map();

  private throttledUpdates: Map<string, Partial<object>> = new Map();

  private updateTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(@InjectRedis() private readonly redis: Redis) {}

  startNewReport<T extends object>(reportName: string, initialValues?: T): string {
    const processId = uuidv4();
    this.activeReports.set(processId, initialValues ?? {});
    Logger.verbose(`Started new report ${reportName} with ID ${processId}`);
    return processId;
  }

  updateReport<T extends object>(processId: string, changes: Partial<T>) {
    const report = this.activeReports.get(processId);
    if (report) {
      this.activeReports.set(processId, { ...report, ...changes });

      // Accumulate updates locally
      const existingUpdates = this.throttledUpdates.get(processId) ?? {};
      this.throttledUpdates.set(processId, { ...existingUpdates, ...changes });

      // If no timer exists, start one
      if (!this.updateTimers.has(processId)) {
        this.updateTimers.set(
          processId,
          setTimeout(() => this.flushUpdates(processId), REPORT_UPDATE_DELAY_MS)
        );
      }
    } else {
      console.error(`Active report with ID ${processId} not found.`);
    }
  }

  private async flushUpdates(processId: string) {
    const updates = this.throttledUpdates.get(processId);
    if (updates) {
      this.throttledUpdates.delete(processId);
      await this.redis.publish(`report:${processId}`, JSON.stringify(updates));
    }

    // Clear the timer
    this.updateTimers.delete(processId);
  }

  async finishReport(processId: string) {
    const report = this.activeReports.get(processId);
    if (report) {
      // Ensure all updates are flushed before finishing
      await this.flushUpdates(processId);

      // Move to inactive reports in Redis with TTL
      await this.redis.set(`report:${processId}`, JSON.stringify(report), RedisModifiers.Expire, REPORT_HISTORY_TTL);
      this.activeReports.delete(processId);
      Logger.verbose(`Report ID ${processId} moved to inactive.`);

      // Notify subscribers that the report is finished
      await this.redis.publish(`report:${processId}:finished`, 'finished');
    } else {
      console.error(`Active report with ID ${processId} not found.`);
    }
  }

  onModuleDestroy() {
    // Clean up any remaining timers to prevent memory leaks
    this.updateTimers.forEach((timer) => clearTimeout(timer));
  }
}
