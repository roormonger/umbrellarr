export const ALPHABET_KEYS = [
  "#",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;

export type AlphabetKey = (typeof ALPHABET_KEYS)[number];

/** First A–Z letter of a sort title, or `#` for numbers/symbols. */
export function letterKey(sortTitle: string): AlphabetKey {
  const trimmed = sortTitle.trim();
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed.charAt(i).toUpperCase();
    if (ch >= "A" && ch <= "Z") return ch as AlphabetKey;
    if (ch >= "0" && ch <= "9") return "#";
  }
  return "#";
}
