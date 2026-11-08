import { METHODS, dosePhrase, type BuddyAction, type BuddyReply, type Safety, type Session } from "@/lib/bude";

const ACTIONS = new Set<BuddyAction>(["timer", "breathe", "munchies"]);
const SAFETIES = new Set<Safety>(["emergency", "pet", "drive", "too-high"]);

const SYSTEM = `You are Bud-E, a calm 21+ cannabis companion. You are not a doctor, not a shop, and not legal advice.

Voice: short, plain, warm. Two to five sentences. No lectures, no slang pile-up, no emojis.

Rules:
- Adults 21+ only. If the person says they are under 21, refuse and tell them to stop.
- Never tell anyone to drive after using cannabis. Tell them to stay put or get a ride.
- Never give a medical diagnosis or say cannabis treats, cures, or is safe for a condition.
- Do not help anyone make, extract, concentrate, sell, or traffic cannabis, and do not help them get it to anyone under 21.
- Edibles: do not suggest taking more until a full 2 hours have passed. Inhaled: suggest waiting 15–20 minutes between hits.
- Chest pain, trouble breathing, fainting, seizure, or a pet that ate cannabis: tell them to get real help now (911 or a vet). Do not tell them to wait it out.
- If they feel too high: they are safe to ride it out, time is the fix, suggest water, a snack, and slow breathing.
- Suggest an action only when it helps: "timer" to wait out a dose, "breathe" when they are too high or anxious, "munchies" when they want food. Otherwise "none".

Reply as JSON with keys text, action, safety. safety is emergency, pet, drive, too-high, or none.`;

type Turn = { role: "user" | "bud"; text: string };

export function sessionBrief(session: Session | null): string {
  if (!session) return "No dose logged tonight.";
  const method = METHODS[session.method];
  return `${dosePhrase(session)} (${method.label}, ${session.experience}). Taken at ${session.timeTaken || "unknown"}.`;
}

export function parseBuddyJson(raw: string): BuddyReply | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const text = "text" in data && typeof data.text === "string" ? data.text.trim() : "";
  if (!text || text.length > 1200) return null;
  const actionRaw = "action" in data ? data.action : null;
  const safetyRaw = "safety" in data ? data.safety : null;
  const action = typeof actionRaw === "string" && ACTIONS.has(actionRaw as BuddyAction) ? (actionRaw as BuddyAction) : undefined;
  const safety = typeof safetyRaw === "string" && SAFETIES.has(safetyRaw as Safety) ? (safetyRaw as Safety) : undefined;
  return { text, action, safety };
}

export async function askGemini(input: {
  message: string;
  history: Turn[];
  session: Session | null;
}): Promise<BuddyReply | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const contents = [
    ...input.history.slice(-8).map((turn) => ({
      role: turn.role === "bud" ? "model" : "user",
      parts: [{ text: turn.text.slice(0, 800) }],
    })),
    {
      role: "user",
      parts: [{ text: `Tonight: ${sessionBrief(input.session)}\n\n${input.message.slice(0, 800)}` }],
    },
  ];
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
      },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 400,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  return parseBuddyJson(text);
}
