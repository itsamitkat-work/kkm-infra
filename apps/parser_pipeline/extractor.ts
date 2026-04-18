import OpenAI from 'openai'
import { FlatRow } from './types'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function extractRows(chunk: string): Promise<FlatRow[]> {
  const prompt = `
Extract ALL rows as flat JSON.

Rules:
- Each row = one object
- Preserve order
- Extract: raw_index, code, text, unit, rate
- DO NOT skip rows

Chunk:
${chunk}

Return JSON array only.
`

  const res = await client.chat.completions.create({
    model: 'gpt-5.3',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0
  })

  return JSON.parse(res.choices[0].message.content!)
}
