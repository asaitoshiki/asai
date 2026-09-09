/**
 * Netflix プレイヤーの DOM に触るのはこのファイルだけ。
 * セレクタが変わったときに直す場所を1箇所に閉じ込める。
 */
const SELECTORS = {
  video: 'video',
  /** オーバーレイの親にする、プレイヤーの表示領域 */
  playerView: '.watch-video--player-view, .watch-video, [data-uia="player"]',
} as const;

export interface Player {
  video: HTMLVideoElement;
  view: HTMLElement;
}

/** プレイヤーが現れるまで待つ。DOM の生成待ちなので存在チェックではない。 */
export function waitForPlayer(signal: AbortSignal): Promise<Player> {
  return new Promise((resolve, reject) => {
    const tryResolve = (): boolean => {
      const video = document.querySelector<HTMLVideoElement>(SELECTORS.video);
      if (!video) return false;
      resolve({ video, view: requireView(video) });
      return true;
    };

    if (tryResolve()) return;

    const observer = new MutationObserver(() => {
      if (tryResolve()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    signal.addEventListener('abort', () => {
      observer.disconnect();
      reject(new Error('submix: プレイヤーの待機を中断しました'));
    });
  });
}

/**
 * video の祖先からプレイヤーの表示領域を取る。
 * 見つからなければ即座に例外を投げて、原因が分かる状態で止める。
 */
function requireView(video: HTMLVideoElement): HTMLElement {
  const view = video.closest<HTMLElement>(SELECTORS.playerView);
  if (!view) {
    throw new Error(
      `submix: プレイヤーの表示領域が見つかりません。セレクタが古くなっています: ${SELECTORS.playerView}`
    );
  }
  return view;
}

/** 標準字幕を隠すためのフラグ。CSS 側の html[data-submix='on'] と対応する。 */
export function setNativeSubtitlesHidden(hidden: boolean): void {
  if (hidden) {
    document.documentElement.dataset['submix'] = 'on';
    return;
  }
  delete document.documentElement.dataset['submix'];
}
