import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisModifiers } from '../enums';

@Injectable()
export class RedisService {
  constructor(
    @InjectRedis('Subscriber') private readonly subscriber: Redis,
    @InjectRedis('Publisher') private readonly publisher: Redis
  ) {
    this.subscriber.on('ready', () => this.onReady('Subscriber'));
    this.publisher.on('ready', () => this.onReady('Publisher'));
    this.subscriber.on('connect', () => this.onConnect('Subscriber'));
    this.publisher.on('connect', () => this.onConnect('Publisher'));
    this.subscriber.on('error', (error) => this.onError('Subscriber', error));
    this.publisher.on('error', (error) => this.onError('Publisher', error));
    this.subscriber.on('message', (message) => console.log('Subscriber', message));
    this.publisher.on('message', (message) => console.log('Publisher', message));
  }

  private onConnect(connectionName: string): void {
    Logger.debug(`${connectionName} is ready to accept commands`);
  }

  private onReady(connectionName: string): void {
    Logger.debug(`${connectionName} connected successfully`);
  }

  private onError(connectionName: string, error: Error): void {
    if ('code' in error && error.code === 'ECONNREFUSED' && 'address' in error && 'port' in error) {
      Logger.error(`Could not connect to ${connectionName} on ${error.address}:${error.port}`);
    } else {
      Logger.error(`${connectionName} encounter an error: ${error.message}`);
    }
  }

  async get<T = object>(key: string): Promise<T | null> {
    return this.publisher.get(key).then((value) => (value ? JSON.parse(value) : null));
  }

  async set<T = object>(key: string, value: T, ttl?: number): Promise<void> {
    if (ttl) {
      await this.publisher.set(key, JSON.stringify(value), RedisModifiers.Expire, ttl);
      return;
    }
    await this.publisher.set(key, JSON.stringify(value));
  }

  async publish<T = object>(channel: string, value: T, retention?: number): Promise<void> {
    if (!retention || retention <= 0) {
      await this.publisher.publish(channel, JSON.stringify(value));
      return;
    }

    Promise.all([this.set(channel, value, retention), this.publish(channel, value)]);
  }

  async closeChannel(channel: string): Promise<void> {
    await this.publish(`${channel}:finished`, 'finished');
  }

  async subscribe(...keys: string[]): Promise<void> {
    await this.subscriber.subscribe(...keys);
  }

  async unsubscribe(...keys: string[]): Promise<void> {
    await this.subscriber.unsubscribe(...keys);
  }

  addListener(channel: string, onData: (data: unknown) => void, onDone?: (data: unknown) => void): () => void {
    const finishedChannel = `${channel}:finished`;
    const handleMessage = (_channel: string, message: string) => {
      if (_channel === channel) {
        onData(JSON.parse(message));
      } else if (_channel === finishedChannel) {
        if (onDone && typeof onDone === 'function') {
          onDone(JSON.parse(message));
        }

        Logger.debug(`Unsubscribing from ${channel} after receiving finished message`);
        this.subscriber.unsubscribe(channel, finishedChannel);
        this.subscriber.off('message', handleMessage);
      }
    };

    this.subscriber.subscribe(channel, finishedChannel);
    this.subscriber.on('message', handleMessage);

    return () => {
      Logger.debug(`Unsubscribing from ${channel} due to manual unsubscribe`);
      this.subscriber.unsubscribe(channel, finishedChannel);
      this.subscriber.off('message', handleMessage);
    };
  }
}
