import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { Socket } from 'socket.io';

@Injectable()
export class SubscriptionService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async subscribeToReport(client: Socket, reportId: string) {
    // Subscribe to Redis channel for report updates
    const updateChannel = `report:${reportId}`;
    const finishedChannel = `report:${reportId}:finished`;

    const listener = async (channel: string, message: string) => {
      if (channel === updateChannel) {
        client.emit('reportUpdate', JSON.parse(message));
      } else if (channel === finishedChannel) {
        client.emit('reportFinished', { reportId });
        // Unsubscribe from the channel as the report is finished
        this.redis.unsubscribe(updateChannel, finishedChannel);
      }
    };

    // Subscribe to the channels
    await this.redis.subscribe(updateChannel, finishedChannel);

    // Listen for messages on the subscribed channels
    this.redis.on('message', listener);

    // Cleanup: Remove listener when the client disconnects
    client.on('disconnect', () => {
      this.redis.off('message', listener);
      this.redis.unsubscribe(updateChannel, finishedChannel);
    });
  }
}
