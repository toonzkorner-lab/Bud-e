import type { BuddyReply, Session } from "@/lib/bude";

export async function askBuddy(input: {
  message: string;
  history: { role: string; text: string }[];
  session: Session | null;
}): Promise<BuddyReply | null> {
  const response = await fetch("/api/buddy", {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(40_000),
    body: JSON.stringify({
      message: input.message,
      history: input.history.slice(-8).map((turn) => ({
        role: turn.role === "bud" ? "bud" : "user",
        text: turn.text,
      })),
      session: input.session,
    }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as Partial<BuddyReply>;
  if (!data || typeof data.text !== "string" || !data.text.trim()) return null;
  return {
    text: data.text,
    action: data.action,
    safety: data.safety,
  };
}
