import { BeaconSettings } from '../types/beacon-settings.type';

export function getReportKey(reportId: string, settings: BeaconSettings) {
  return `beacon:${settings.name}:${reportId}`;
}
