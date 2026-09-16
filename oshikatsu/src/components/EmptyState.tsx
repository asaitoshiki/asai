export function EmptyState({ emoji, title, hint }: { emoji: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <span className="text-4xl">{emoji}</span>
      <p className="font-bold">{title}</p>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  )
}
