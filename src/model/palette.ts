import type { BlockColor, PaletteKey } from './types.ts'

export interface Swatch {
  key: BlockColor
  name: string
  fill: string
  text: string
}

export const COURSE_ORDER: readonly PaletteKey[] = [
  'violet',
  'blue',
  'teal',
  'green',
  'gold',
  'orange',
  'indigo',
  'pink',
]

/** Table order. Plain pickers put slate first; course pickers use COURSE_ORDER. */
export const SWATCHES: readonly Swatch[] = [
  { key: 'violet', name: 'Violet', fill: '#6C5DD3', text: '#7C6BF2' },
  { key: 'blue', name: 'Blue', fill: '#3B6DC4', text: '#4C8DFF' },
  { key: 'teal', name: 'Teal', fill: '#1D7B6D', text: '#2BB5A0' },
  { key: 'green', name: 'Green', fill: '#2D7D4D', text: '#3DAB6A' },
  { key: 'gold', name: 'Gold', fill: '#886B26', text: '#E2B340' },
  { key: 'orange', name: 'Orange', fill: '#A65A2D', text: '#E07A3D' },
  { key: 'indigo', name: 'Indigo', fill: '#5766CD', text: '#7480DC' },
  { key: 'pink', name: 'Pink', fill: '#A1519F', text: '#D46AD1' },
  { key: 'slate', name: 'Gray', fill: '#4E4866', text: '#A1A1AA' },
]

const byKey = new Map(SWATCHES.map((s) => [s.key, s]))

export function swatch(key: BlockColor): Swatch {
  return byKey.get(key) ?? SWATCHES[SWATCHES.length - 1]
}

export function courseSwatches(): Swatch[] {
  return COURSE_ORDER.map((key) => swatch(key))
}

export function plainSwatches(): Swatch[] {
  return [swatch('slate'), ...courseSwatches()]
}
