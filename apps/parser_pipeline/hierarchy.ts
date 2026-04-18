import { FlatRow, TreeNode } from './types'

export function buildTree(rows: FlatRow[]): TreeNode[] {
  const map: Record<string, TreeNode> = {}
  const roots: TreeNode[] = []

  for (const row of rows) {
    if (!row.code) continue

    const node: TreeNode = {
      code: row.code,
      text: cleanText(row.text),
      node_type: getNodeType(row.code),
      unit: row.unit,
      rate: row.rate,
      children: []
    }

    map[row.code] = node

    const parentCode = getParentCode(row.code)

    if (!parentCode) {
      roots.push(node)
    } else {
      map[parentCode]?.children.push(node)
    }
  }

  return roots
}

function getParentCode(code: string): string | null {
  const parts = code.split('.')
  if (parts.length === 1) return null
  return parts.slice(0, -1).join('.')
}

function getNodeType(code: string): TreeNode['node_type'] {
  const depth = code.split('.').length
  if (depth === 1) return 'section'
  if (depth === 2) return 'group'
  return 'item'
}

function cleanText(text: string) {
  return text.replace(/^\d+(\.\d+)*/, '').trim()
}
