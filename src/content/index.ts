import { onBridgeMessage } from './bridge';
import { Session } from './session';

const controller = new AbortController();
let current: Session | null = null;

onBridgeMessage((message) => {
  if (message.type === 'track-error') {
    console.warn('[submix] 字幕トラックを取得できません:', message.reason);
    return;
  }
  if (current?.movieId === message.movieId) return;

  // 先に前のセッションを畳んでから次を組む。標準字幕の表示状態が入れ違わないようにする
  current?.destroy();
  current = null;

  void Session.start(message.movieId, message.tracks, controller.signal)
    .then((session) => {
      current = session;
      console.log(`[submix] ${message.movieId} の振り分けを開始しました`);
    })
    .catch((error: unknown) => {
      console.error('[submix]', error);
    });
});
