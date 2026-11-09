export type Tier = "free" | "lit" | "cloud";

export const TIER_RANK: Record<Tier, number> = { free: 0, lit: 1, cloud: 2 };

export function isTier(value: unknown): value is Tier {
  return value === "free" || value === "lit" || value === "cloud";
}

export function tierAtLeast(tier: Tier, need: Tier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[need];
}

export const LIT_THEMES = ["velvet", "grove", "hours"] as const;

export const PERSONAS = [
  { id: "bud", name: "Bud-E", tier: "free" as const, detail: "Short, plain, and warm." },
  { id: "coach", name: "Coach", tier: "lit" as const, detail: "Direct steps. No pep talk." },
  { id: "soft", name: "Soft", tier: "lit" as const, detail: "Gentle, then one next step." },
  { id: "straight", name: "Straight", tier: "lit" as const, detail: "Facts only." },
  { id: "custom", name: "Yours", tier: "cloud" as const, detail: "Made from what you asked for." },
] as const;

export type PersonaId = (typeof PERSONAS)[number]["id"];

export function isPersonaId(value: unknown): value is PersonaId {
  return PERSONAS.some((persona) => persona.id === value);
}

const VOICES: Record<Exclude<PersonaId, "custom">, string> = {
  bud: "Short, plain, and warm. Two to five sentences. No slang pile-up.",
  coach: "Direct and practical. Give the next step in a sentence, then stop. No pep talk.",
  soft: "Gentle and unhurried. Reassure in one sentence, then one clear next step.",
  straight: "Plain facts only. No warmth, no jokes, no extra words.",
};

export function personaVoice(id: PersonaId, customVoice: string): string {
  if (id === "custom") return customVoice.trim().slice(0, 280) || VOICES.bud;
  return VOICES[id];
}

export function planLimit(tier: Tier): number {
  return tier === "free" ? 1 : 40;
}

export type SavedPlan = { id: string; title: string; body: string; createdAt: number };

export type Membership = {
  tier: Tier;
  persona: PersonaId;
  customName: string;
  customVoice: string;
  accent: string;
  themeName: string;
  plans: SavedPlan[];
  preview: boolean;
  shop: boolean;
};
