import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ReportingService } from './services';
import { DashboardGateway } from './gateways/dashboard.gateway';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: 'redis://localhost:6380',
    }),
  ],
  providers: [ReportingService, DashboardGateway],
  exports: [ReportingService],
})
export class BeaconModule {}
