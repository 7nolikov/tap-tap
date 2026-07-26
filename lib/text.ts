/**
 * Truncates to the first grapheme cluster.
 *
 * `maxLength={2}` on the emoji input counted UTF-16 code units, which cut
 * multi-codepoint emoji (👨‍🍳, ✏️, 🏳️‍🌈) mid-sequence and produced mojibake.
 */
export function firstGrapheme(value: string): string {
  if (!value) return ""
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter
  if (Segmenter) {
    const [first] = new Segmenter(undefined, { granularity: "grapheme" }).segment(value)
    return first?.segment ?? ""
  }
  return Array.from(value)[0] ?? ""
}

/** Case- and diacritic-insensitive fold, so "creme" matches "Crème Fraîche". */
export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}

export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)
