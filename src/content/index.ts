import { onBridgeMessage } from './bridge';
import { parseTrack } from '../core/parse';

// マイルストーン1: 日英キューが取れていることをコンソールで確認する
onBridgeMessage((message) => {
  if (message.type === 'track-error') {
    console.warn('[submix] 字幕トラックを取得できません:', message.reason);
    return;
  }

  for (const track of message.tracks) {
    const cues = parseTrack(track.format, track.body);
    console.log(`[submix] ${message.movieId} ${track.language} ${cues.length}行`, cues.slice(0, 5));
  }
});
