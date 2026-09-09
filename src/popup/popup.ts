import { probabilitiesFor } from '../core/levels';
import { L0, L1, type Level } from '../core/types';
import {
  clearFallbacks,
  loadFallbacks,
  loadSettings,
  saveSettings,
  type FallbackRecord,
  type Settings,
} from '../shared/storage';

const LEVEL_LABEL: Record<Level, string> = { [L0]: '日本語', [L1]: '英語', 2: 'なし' };

const app = document.getElementById('app')!;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** 秒を mm:ss にする。記録から該当シーンを探せる程度で足りる。 */
function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function renderMix(settings: Settings): HTMLElement {
  const section = element('section', 'panel');
  section.append(element('h2', undefined, '負荷'));

  const slider = element('input', 'slider');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.step = '1';
  slider.value = String(settings.load);

  const value = element('div', 'value', String(settings.load));
  const shares = element('div', 'shares');

  const paint = (load: number): void => {
    const p = probabilitiesFor(load);
    value.textContent = String(load);
    shares.textContent = `日本語 ${Math.round(p[0] * 100)}% / 英語 ${Math.round(p[1] * 100)}% / なし ${Math.round(p[2] * 100)}%`;
  };
  paint(settings.load);

  slider.addEventListener('input', () => {
    paint(Number(slider.value));
  });
  slider.addEventListener('change', () => {
    void saveSettings({ load: Number(slider.value) });
  });

  section.append(slider, value, shares);
  return section;
}

function renderControls(settings: Settings): HTMLElement {
  const section = element('section', 'panel row');

  const toggle = element('label', 'toggle');
  const checkbox = element('input');
  checkbox.type = 'checkbox';
  checkbox.checked = settings.enabled;
  checkbox.addEventListener('change', () => {
    void saveSettings({ enabled: checkbox.checked });
  });
  toggle.append(checkbox, element('span', undefined, '有効'));

  const remix = element('button', 'button', '混ぜ直す');
  remix.addEventListener('click', () => {
    void saveSettings({ mixSeed: settings.mixSeed + 1 }).then((next) => {
      settings.mixSeed = next.mixSeed;
    });
  });

  section.append(toggle, remix);
  return section;
}

function renderLog(records: FallbackRecord[]): HTMLElement {
  const section = element('section', 'panel');

  const head = element('div', 'row');
  head.append(element('h2', undefined, `聞き取れなかった行 (${records.length})`));

  const clear = element('button', 'button button--quiet', '消す');
  clear.addEventListener('click', () => {
    void clearFallbacks().then(render);
  });
  head.append(clear);
  section.append(head);

  if (records.length === 0) {
    section.append(element('p', 'empty', 'まだありません'));
    return section;
  }

  const list = element('ul', 'log');
  for (const record of [...records].reverse().slice(0, 50)) {
    const item = element('li', 'log__item');
    item.append(
      element('div', 'log__meta', `${formatTime(record.start)}  ${LEVEL_LABEL[record.from]} → ${LEVEL_LABEL[record.to]}`),
      element('div', 'log__en', record.en),
      element('div', 'log__ja', record.ja)
    );
    list.append(item);
  }
  section.append(list);
  return section;
}

async function render(): Promise<void> {
  const [settings, records] = await Promise.all([loadSettings(), loadFallbacks()]);

  app.replaceChildren(renderMix(settings), renderControls(settings), renderLog(records));
}

void render();
