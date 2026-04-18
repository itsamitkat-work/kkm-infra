import { TreeNode } from './types'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)

export async function insertTree(
  nodes: TreeNode[],
  versionId: string,
  parentId: string | null = null
) {
  for (const node of nodes) {
    const { data, error } = await supabase
      .from('schedule_items')
      .insert({
        schedule_source_version_id: versionId,
        parent_item_id: parentId,
        code: node.code,
        description: node.text,
        node_type: node.node_type,
        rate: node.rate ?? null,
        slug: node.code?.replace(/\./g, '_'),
        order_index: 0
      })
      .select()
      .single()

    if (error) throw error

    if (node.children.length) {
      await insertTree(node.children, versionId, data.id)
    }
  }
}
