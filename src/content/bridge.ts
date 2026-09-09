import { isBridgeMessage, type BridgeMessage } from '../shared/messages';

/** MAIN world から postMessage で届く合図を受け取る。 */
export function onBridgeMessage(handler: (message: BridgeMessage) => void): void {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window) return;
    if (!isBridgeMessage(event.data)) return;
    handler(event.data);
  });
}
