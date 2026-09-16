import type { ComponentProps, ReactNode } from 'react'

/** 画面内の区切りカード */
export const Card = ({ className = '', ...props }: ComponentProps<'div'>) => (
  <div
    className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-4 ${className}`}
    {...props}
  />
)

type ButtonProps = ComponentProps<'button'> & { variant?: 'primary' | 'ghost' | 'danger' }

const buttonStyles = {
  primary: 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:bg-amber-600',
  ghost: 'bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-600',
  danger: 'bg-rose-900/60 text-rose-200 hover:bg-rose-800/70',
} as const

export const Button = ({ variant = 'primary', className = '', ...props }: ButtonProps) => (
  <button
    className={`rounded-xl px-4 py-3 text-base font-bold transition-colors disabled:opacity-40 ${buttonStyles[variant]} ${className}`}
    {...props}
  />
)

export const TextInput = ({ className = '', ...props }: ComponentProps<'input'>) => (
  <input
    className={`w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none placeholder:text-slate-500 focus:border-amber-400 ${className}`}
    {...props}
  />
)

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-2 text-sm font-bold tracking-wide text-slate-400">{children}</h2>
)

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="rounded-2xl border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
    {children}
  </p>
)
