export type FlatRow = {
  raw_index: number
  code: string | null
  text: string
  unit?: string
  rate?: number
  source_page?: number
}

export type ValidationResult = {
  valid: boolean
  errors: string[]
  missingCodes: string[]
}

export type TreeNode = {
  code: string | null
  text: string
  node_type: 'section' | 'group' | 'item' | 'unknown'
  unit?: string
  rate?: number
  children: TreeNode[]
}
