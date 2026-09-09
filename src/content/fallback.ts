import { FALLBACK_KEY } from '../core/constants';

/** 入力中のキー操作を字幕操作として拾わない。 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * 聞き取れなかったときのキーを1つだけ見張る。
 * Netflix 側のショートカットに食われないよう capture 段階で止める。
 */
export function onFallbackKey(handler: () => void, signal: AbortSignal): void {
  document.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key !== FALLBACK_KEY) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      handler();
    },
    { capture: true, signal }
  );
}
