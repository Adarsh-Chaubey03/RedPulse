import type { RequestStatus } from './index';

/**
 * Client-side mirror of the server state machine.
 * The server is authoritative — this is used only for UI hints.
 */
export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  searching:          ['partiallyFulfilled', 'fulfilled', 'expired', 'cancelled'],
  partiallyFulfilled: ['fulfilled', 'expired', 'cancelled'],
  fulfilled:          [],
  expired:            [],
  cancelled:          [],
};
