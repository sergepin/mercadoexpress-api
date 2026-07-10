import { Alert } from '../../modules/alerts/entities/alert.entity';

export const ALERT_CREATED_EVENT = 'alert.created';
export const ALERT_RESOLVED_EVENT = 'alert.resolved';

export class AlertLifecycleEvent {
  constructor(public readonly alert: Alert) {}
}
