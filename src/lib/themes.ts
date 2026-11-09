export const THEMES = [
  { id: "night", name: "Night garden", detail: "Deep green. The original." },
  { id: "day", name: "Day garden", detail: "Paper and daylight." },
  { id: "ember", name: "Amber lounge", detail: "Warm lamp light." },
  { id: "moon", name: "Moon", detail: "Cool blue night." },
  { id: "velvet", name: "Velvet room", detail: "Plum night. Lit." },
  { id: "grove", name: "Deep grove", detail: "Brighter forest. Lit." },
  { id: "hours", name: "After hours", detail: "Ink and silver. Lit." },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}
