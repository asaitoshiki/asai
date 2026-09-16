import { OSHI_COLORS } from '../db/schema'
import { cls } from '../lib/cls'

export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="grid grid-cols-9 gap-2">
      {OSHI_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          onClick={() => onChange(color)}
          style={{ backgroundColor: color }}
          className={cls(
            'aspect-square rounded-full border-2',
            value === color ? 'border-fg' : 'border-line',
          )}
        />
      ))}
    </div>
  )
}
