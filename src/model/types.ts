export type DateStr = string
export type PaletteKey =
  | 'violet'
  | 'blue'
  | 'teal'
  | 'green'
  | 'gold'
  | 'orange'
  | 'indigo'
  | 'pink'
export type BlockColor = PaletteKey | 'slate'
export type View = 'day' | '3day' | 'week' | 'month'

export interface Meta {
  createdAt: number
  updatedAt: number
  updatedBy: string
}

export interface Course extends Meta {
  id: string
  name: string
  color: PaletteKey
}

export interface WorkItem extends Meta {
  id: string
  courseId: string
  kind: 'homework' | 'exam'
  title: string
  date: DateStr
  completedAt: DateStr | null
  estimateMinutes: number | null
}

export interface Session extends Meta {
  id: string
  date: DateStr
  start: number | null
  end: number | null
  workItemId: string | null
  title: string | null
  color: BlockColor | null
  repeat: 'none' | 'daily' | 'weekdays'
  tz: string
}

export interface Profile {
  tz: string
  createdAt: number
}
