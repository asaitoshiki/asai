import { onBridgeMessage } from './bridge';
import { parseTrack } from '../core/parse';
import { findSpanAt } from '../core/timeline';
import { Overlay } from './overlay';
import { setNativeSubtitlesHidden, waitForPlayer } from './player';
import type { Cue } from '../core/types';

// マイルストーン2: 自前オーバーレイで日本語字幕だけを描く
const controller = new AbortController();

onBridgeMessage((message) => {
  if (message.type === 'track-error') {
    console.warn('[submix] 字幕トラックを取得できません:', message.reason);
    return;
  }

  const japanese = message.tracks.find((track) => track.language === 'ja');
  if (!japanese) return;

  const cues = parseTrack(japanese.format, japanese.body);
  console.log(`[submix] ${message.movieId} ja ${cues.length}行`);
  void start(cues);
});

async function start(cues: Cue[]): Promise<void> {
  const { video, view } = await waitForPlayer(controller.signal);
  const overlay = new Overlay(view);
  setNativeSubtitlesHidden(true);

  const tick = (): void => {
    const index = findSpanAt(cues, video.currentTime);
    overlay.render(index < 0 ? '' : cues[index]!.text, 0);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
