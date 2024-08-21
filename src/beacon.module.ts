import { DynamicModule, Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisService, ReportingService, SubscriptionService } from './services';
import { DashboardGateway } from './gateways/dashboard.gateway';
import { BeaconOptions } from './types';
import { SETTINGS } from './constants';

@Module({})
export class BeaconModule {
  static register(options: BeaconOptions): DynamicModule {
    const { redisOptions, ...settings } = options;
    return {
      module: BeaconModule,
      imports: [
        RedisModule.forRoot(
          {
            type: 'single',
            options: { ...redisOptions },
          },
          'Publisher'
        ),
        RedisModule.forRoot(
          {
            type: 'single',
            options: { ...redisOptions },
          },
          'Subscriber'
        ),
      ],
      providers: [
        { provide: SETTINGS, useValue: settings },
        RedisService,
        ReportingService,
        SubscriptionService,
        DashboardGateway,
      ],
      exports: [ReportingService],
    };
  }
}
