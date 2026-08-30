/** Apply highlight hex to document CSS variables used by Nebula / backdrop. */
export function applyHighlightCssVars(hex: string) {
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  const match = /^#([0-9A-Fa-f]{6})$/.exec(normalized);
  if (!match) return;

  const value = match[1];
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  const root = document.documentElement;
  root.style.setProperty("--highlight", `#${value.toUpperCase()}`);
  root.style.setProperty("--highlight-rgb", `${r}, ${g}, ${b}`);
}

export function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!match) return null;
  const value = match[1];
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}
