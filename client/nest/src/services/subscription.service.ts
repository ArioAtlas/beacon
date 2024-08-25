import { SETTINGS } from '../constants';
import { getReportKey } from '../helpers';
import { BeaconSettings } from '../types/beacon-settings.type';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { RedisService } from './redis.service';

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(SETTINGS) private readonly settings: BeaconSettings,
    private readonly redis: RedisService
  ) {}

  async subscribeToReportList(client: Socket) {
    const channel = getReportKey('list', this.settings);
    const handleData = (data: unknown) => client.emit('reportListUpdate', data);

    const unsubscribe = this.redis.addListener(channel, handleData);

    client.emit('reportListUpdate', (await this.redis.get(channel)) ?? []);

    // Cleanup: Remove listener when the client disconnects
    client.on('disconnect', () => {
      unsubscribe();
      Logger.log(`Client ${client.id} unsubscribed from report list`);
    });
  }

  async subscribeToReport(client: Socket, reportId: string) {
    // Subscribe to Redis channel for report updates
    const channel = getReportKey(reportId, this.settings);
    const handleData = (data: unknown) => client.emit('reportUpdate', data);
    const handleDone = () => client.emit('reportFinished', { reportId });

    const unsubscribe = this.redis.addListener(channel, handleData, handleDone);

    // Cleanup: Remove listener when the client disconnects
    client.on('disconnect', () => {
      unsubscribe();
      Logger.log(`Client ${client.id} unsubscribed from report ${reportId}`);
    });
  }
}
