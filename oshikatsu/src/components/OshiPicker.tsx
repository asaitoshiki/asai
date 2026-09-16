import type { ID, Oshi } from '../db/schema'
import { Chip, ChipRow } from './Chip'

interface OshiPickerProps {
  oshiList: Oshi[]
  value: ID | undefined
  onChange: (id: ID | undefined) => void
  /** 「すべて」を選べるようにする（絞り込み用） */
  allLabel?: string
}

export function OshiPicker({ oshiList, value, onChange, allLabel = '指定なし' }: OshiPickerProps) {
  return (
    <ChipRow>
      <Chip label={allLabel} active={value === undefined} onClick={() => onChange(undefined)} />
      {oshiList.map((oshi) => (
        <Chip
          key={oshi.id}
          label={oshi.name}
          color={oshi.color}
          active={value === oshi.id}
          onClick={() => onChange(oshi.id)}
        />
      ))}
    </ChipRow>
  )
}
