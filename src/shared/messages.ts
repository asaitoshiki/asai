import type { RawTrack } from '../core/types';

/** ページコンテキスト（MAIN world）と content script の間の合図。 */
export const BRIDGE_SOURCE = 'submix';

export interface TracksMessage {
  source: typeof BRIDGE_SOURCE;
  type: 'tracks';
  movieId: string;
  tracks: RawTrack[];
}

export interface TrackErrorMessage {
  source: typeof BRIDGE_SOURCE;
  type: 'track-error';
  movieId: string;
  reason: string;
}

export type BridgeMessage = TracksMessage | TrackErrorMessage;

export function isBridgeMessage(value: unknown): value is BridgeMessage {
  return typeof value === 'object' && value !== null && (value as BridgeMessage).source === BRIDGE_SOURCE;
}
