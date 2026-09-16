/** 条件付きクラス名の連結 */
export const cls = (...values: (string | false | null | undefined)[]): string =>
  values.filter(Boolean).join(' ')
