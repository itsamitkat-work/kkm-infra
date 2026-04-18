export function chunkByPages(pages: string[]): string[] {
  return pages.map((p, i) => `PAGE ${i + 1}\n${p}`)
}
