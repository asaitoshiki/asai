import { alignCues } from '../core/align';
import { FALLBACK_PREROLL_SEC, FALLBACK_STEP } from '../core/constants';
import { assignLevels, materialize } from '../core/levels';
import { parseTrack } from '../core/parse';
import { findSpanAt } from '../core/timeline';
import { L0, L1, type Level, type RawTrack, type Unit } from '../core/types';
import { appendFallback, loadSettings, onSettingsChanged, type Settings } from '../shared/storage';
import { onFallbackKey } from './fallback';
import { Overlay } from './overlay';
import { setNativeSubtitlesHidden, waitForPlayer } from './player';

/**
 * 1本の動画に対する再生セッション。
 * 字幕の対応付けと振り分けを持ち、再生位置に応じてオーバーレイを描く。
 */
export class Session {
  private readonly units: Unit[];
  private levels: Level[];
  private settings: Settings;
  /** フォールバックで一段下げた行。混ぜ直すと消える。 */
  private readonly overrides = new Map<number, Level>();

  private constructor(
    readonly movieId: string,
    private readonly video: HTMLVideoElement,
    private readonly overlay: Overlay,
    units: Unit[],
    settings: Settings
  ) {
    this.units = units;
    this.settings = settings;
    this.levels = this.mix();
  }

  static async start(movieId: string, tracks: RawTrack[], signal: AbortSignal): Promise<Session> {
    const ja = tracks.find((track) => track.language === 'ja');
    const en = tracks.find((track) => track.language === 'en');
    if (!ja || !en) throw new Error('submix: 日本語と英語の両方のトラックが必要です');

    const units = alignCues(parseTrack(ja.format, ja.body), parseTrack(en.format, en.body));
    const settings = await loadSettings();
    const { video, view } = await waitForPlayer(signal);

    const session = new Session(movieId, video, new Overlay(view), units, settings);
    session.run();
    return session;
  }

  /** 現在の設定で振り分け直す。 */
  private mix(): Level[] {
    return assignLevels(this.units, {
      load: this.settings.load,
      movieId: this.movieId,
      mixSeed: this.settings.mixSeed,
    });
  }

  private run(): void {
    setNativeSubtitlesHidden(this.settings.enabled);

    onSettingsChanged((settings) => {
      const remixed = settings.mixSeed !== this.settings.mixSeed;
      this.settings = settings;
      this.levels = this.mix();
      if (remixed) this.overrides.clear();
      setNativeSubtitlesHidden(settings.enabled);
    });

    onFallbackKey(() => {
      void this.fallback();
    });

    const tick = (): void => {
      this.draw();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private draw(): void {
    if (!this.settings.enabled) {
      this.overlay.render('', L0);
      return;
    }

    const index = this.currentIndex();
    if (index < 0) {
      this.overlay.render('', L0);
      return;
    }

    const level = this.levelAt(index);
    this.overlay.render(this.textFor(index, level), level);
  }

  /** 再生位置に対応する表示単位。 */
  currentIndex(): number {
    return findSpanAt(this.units, this.video.currentTime);
  }

  levelAt(index: number): Level {
    return this.overrides.get(index) ?? this.levels[index]!;
  }

  /**
   * 聞き取れなかった行を一段だけ下げ、その行の頭まで巻き戻して聴き直す。
   * 日本語まで一気に落とさないのが要点。
   */
  private async fallback(): Promise<void> {
    const index = this.currentIndex();
    if (index < 0) return;

    const unit = this.units[index]!;
    const from = this.levelAt(index);
    const to = materialize(unit, FALLBACK_STEP[from]);
    if (to === from) return;

    this.overrides.set(index, to);
    this.video.currentTime = Math.max(0, unit.start - FALLBACK_PREROLL_SEC);
    void this.video.play();

    await appendFallback({
      movieId: this.movieId,
      index,
      from,
      to,
      start: unit.start,
      ja: unit.ja,
      en: unit.en,
      at: Date.now(),
    });
  }

  private textFor(index: number, level: Level): string {
    const unit = this.units[index]!;
    if (level === L0) return unit.ja;
    if (level === L1) return unit.en;
    return '';
  }
}
