/** 自前の字幕オーバーレイ。描画するテキストは呼び出し側が決める。 */
export class Overlay {
  private readonly root: HTMLElement;
  private readonly line: HTMLElement;
  private shown = '';

  constructor(view: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'submix-overlay';
    this.line = document.createElement('div');
    this.line.className = 'submix-line';
    this.root.append(this.line);
    view.append(this.root);
  }

  /** 同じ文字列なら DOM を触らない。 */
  render(text: string, level: number): void {
    if (text === this.shown && this.line.dataset['level'] === String(level)) return;
    this.shown = text;
    this.line.dataset['level'] = String(level);
    this.line.textContent = text;
    this.line.classList.toggle('submix-line--empty', text.length === 0);
  }

  destroy(): void {
    this.root.remove();
  }
}
