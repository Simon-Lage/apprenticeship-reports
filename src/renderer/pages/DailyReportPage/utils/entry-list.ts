export default function normalizeEntryList(items: string[]): string[] {
  return Array.from(
    new Set(items.map((item) => item.trim()).filter((item) => item.length)),
  ).filter((item) => item.length <= 240);
}
