import { METHODS, dosePhrase, type BuddyAction, type BuddyReply, type Safety, type Session } from "@/lib/bude";

const ACTIONS = new Set<BuddyAction>(["timer", "breathe", "munchies"]);
const SAFETIES = new Set<Safety>(["emergency", "pet", "drive", "too-high"]);

const SYSTEM = `You are Bud-E, a calm 21+ cannabis companion. You are not a doctor, not a shop, and not legal advice.

Voice: short, plain, warm. Two to five sentences. No lectures, no slang pile-up, no emojis. Answer the message they actually sent, even if it is one word. Do not tell them to log a dose unless they asked about a dose.

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
}): Promise<{ reply: BuddyReply | null; status: number }> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return { reply: null, status: 0 };
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
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
  // Free-tier Gemini allows about 5 requests a minute. A second model call
  // burns that budget, which is why some messages fell through to the script.
  let attempt = await callModel(model, key, contents);
  if (!attempt.reply && attempt.status === 429) {
    await delay(attempt.retryMs);
    attempt = await callModel(model, key, contents);
  }
  if (!attempt.reply && attempt.status === 503) {
    const backup = model === "gemini-3.6-flash" ? "gemini-3.5-flash" : "gemini-3.6-flash";
    attempt = await callModel(backup, key, contents);
  }
  return { reply: attempt.reply, status: attempt.status };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callModel(
  model: string,
  key: string,
  contents: { role: string; parts: { text: string }[] }[],
): Promise<{ reply: BuddyReply | null; status: number; retryMs: number }> {
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": key,
        },
        signal: AbortSignal.timeout(18_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents,
          safetySettings: [
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          ],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 500,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );
  } catch {
    return { reply: null, status: 0, retryMs: 8_000 };
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const match = /retry in ([\d.]+)s/i.exec(detail);
    const retryMs = match ? Math.min(Math.ceil(Number(match[1]) * 1000) + 400, 15_000) : 8_000;
    return { reply: null, status: response.status, retryMs };
  }
  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  return { reply: parseBuddyJson(text), status: 200, retryMs: 0 };
}
