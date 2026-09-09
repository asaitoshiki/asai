// MV3 の content script は ES モジュールを読めないため、エントリごとに
// IIFE で個別ビルドする。Vite の単一ビルドでは共有チャンクが出て壊れる。
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');

/** エントリ名 → 入力ファイル。出力は dist/<name>.js */
const ENTRIES = {
  hook: 'src/page/hook.ts',
  content: 'src/content/index.ts',
  popup: 'src/popup/popup.ts',
};

let first = true;
for (const [name, input] of Object.entries(ENTRIES)) {
  await build({
    root,
    configFile: false,
    // public/ の中身は最初のビルドでだけ dist へコピーする
    publicDir: first ? resolve(root, 'public') : false,
    build: {
      outDir: 'dist',
      emptyOutDir: first,
      target: 'chrome114',
      minify: false,
      sourcemap: watch,
      watch: watch ? {} : null,
      lib: {
        entry: resolve(root, input),
        formats: ['iife'],
        name: `submix_${name}`,
        fileName: () => `${name}.js`,
      },
    },
  });
  first = false;
}
