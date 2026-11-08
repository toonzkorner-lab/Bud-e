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

export async function askGroq(input: {
  message: string;
  history: Turn[];
  session: Session | null;
}): Promise<{ reply: BuddyReply | null; status: number }> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return { reply: null, status: 0 };
  const model = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
  const messages = [
    { role: "system", content: SYSTEM },
    ...input.history.slice(-8).map((turn) => ({
      role: turn.role === "bud" ? "assistant" : "user",
      content: turn.text.slice(0, 800),
    })),
    {
      role: "user",
      content: `Tonight: ${sessionBrief(input.session)}\n\n${input.message.slice(0, 800)}`,
    },
  ];
  let attempt = await callGroq(model, key, messages);
  if (!attempt.reply && attempt.status === 429) {
    await delay(attempt.retryMs);
    attempt = await callGroq(model, key, messages);
  }
  if (!attempt.reply && (attempt.status === 503 || attempt.status === 429)) {
    const backup = model === "openai/gpt-oss-20b" ? "qwen/qwen3.8-27b" : "openai/gpt-oss-20b";
    attempt = await callGroq(backup, key, messages);
  }
  return { reply: attempt.reply, status: attempt.status };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGroq(
  model: string,
  key: string,
  messages: { role: string; content: string }[],
): Promise<{ reply: BuddyReply | null; status: number; retryMs: number }> {
  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
        "user-agent": "bud-e/1.0",
      },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages,
      }),
    });
  } catch {
    return { reply: null, status: 0, retryMs: 4_000 };
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const match = /try again in ([\d.]+)s/i.exec(detail);
    const retryMs = match ? Math.min(Math.ceil(Number(match[1]) * 1000) + 300, 8_000) : 2_000;
    return { reply: null, status: response.status, retryMs };
  }
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = payload.choices?.[0]?.message?.content ?? "";
  return { reply: parseBuddyJson(text), status: 200, retryMs: 0 };
}
