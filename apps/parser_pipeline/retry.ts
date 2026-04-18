import { extractRows } from './extractor'
import { FlatRow } from './types'

export async function retryMissing(
  chunk: string,
  missingCodes: string[]
): Promise<FlatRow[]> {
  const prompt = `
Previous extraction missed these codes:
${missingCodes.join(', ')}

Fix ONLY missing rows.
Do NOT regenerate full list.

Chunk:
${chunk}
`

  return extractRows(prompt)
}
