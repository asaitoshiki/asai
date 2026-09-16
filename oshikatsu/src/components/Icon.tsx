// 下部タブやボタンで使う最小限のラインアイコン
const PATHS = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  calendar: 'M4 8.5h16M7 3.5v3M17 3.5v3M5 5.5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z',
  photo: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 11 5-5 4 4 3-3 5 5M9 10a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 9 10Z',
  wallet: 'M3 7.5A1.5 1.5 0 0 1 4.5 6h13A1.5 1.5 0 0 1 19 7.5v2m0 5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 16.5v-9M15.5 9.5H21v5h-5.5a2.5 2.5 0 0 1 0-5Z',
  heart: 'M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  book: 'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm12 3h2v13H8',
  pin: 'M12 21s6-6.2 6-10.5A6 6 0 1 0 6 10.5C6 14.8 12 21 12 21Zm0-8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  bag: 'M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2',
  gear: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm8-3.2a8 8 0 0 0-.2-1.7l2-1.5-2-3.4-2.3 1a8 8 0 0 0-2.9-1.7L14.2 2H9.8l-.4 2.7a8 8 0 0 0-2.9 1.7l-2.3-1-2 3.4 2 1.5a8.1 8.1 0 0 0 0 3.4l-2 1.5 2 3.4 2.3-1a8 8 0 0 0 2.9 1.7l.4 2.7h4.4l.4-2.7a8 8 0 0 0 2.9-1.7l2.3 1 2-3.4-2-1.5c.13-.55.2-1.12.2-1.7Z',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z',
  trash: 'M5 7h14M10 7V5h4v2m-6 0 .7 13h6.6L16 7',
  light: 'M12 3v2m0 14v2M5 12H3m18 0h-2M6.3 6.3 4.9 4.9m14.2 1.4 1.4-1.4M6.3 17.7l-1.4 1.4m14.2-1.4 1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
} as const

export type IconName = keyof typeof PATHS

interface IconProps {
  name: IconName
  className?: string
  filled?: boolean
}

export function Icon({ name, className = 'size-6', filled = false }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
