const formatter = new Intl.NumberFormat('ja-JP')

export const formatYen = (amount: number): string => `¥${formatter.format(amount)}`

export const formatNumber = (value: number): string => formatter.format(value)
