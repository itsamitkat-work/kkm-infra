import { chunkByPages } from './chunker'
import { extractRows } from './extractor'
import { validateRows } from './validator'
import { retryMissing } from './retry'
import { buildTree } from './hierarchy'
import { insertTree } from './db'

async function run(pages: string[], versionId: string) {
  const chunks = chunkByPages(pages)

  let allRows: any[] = []

  for (const chunk of chunks) {
    let rows = await extractRows(chunk)

    const validation = validateRows(rows)

    if (!validation.valid) {
      const fixes = await retryMissing(chunk, validation.missingCodes)
      rows = [...rows, ...fixes]
    }

    allRows.push(...rows)
  }

  allRows.sort((a, b) => a.raw_index - b.raw_index)

  const tree = buildTree(allRows)

  await insertTree(tree, versionId)

  console.log('✅ Done')
}
