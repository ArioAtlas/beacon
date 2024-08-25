import { BeaconSettings } from './beacon-settings.type';
import { RedisOptions } from './redis-options.type';

export type BeaconOptions = {
  redisOptions: RedisOptions;
} & BeaconSettings;
