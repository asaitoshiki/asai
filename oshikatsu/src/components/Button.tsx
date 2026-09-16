import type { ButtonHTMLAttributes } from 'react'
import { cls } from '../lib/cls'

type Variant = 'primary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg',
  ghost: 'border border-line bg-surface-2 text-fg',
  danger: 'border border-rose-300 text-rose-500 dark:border-rose-500/40',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cls(
        'w-full rounded-xl px-4 py-3 text-center text-sm font-bold disabled:opacity-40',
        VARIANTS[variant],
        className,
      )}
    />
  )
}
