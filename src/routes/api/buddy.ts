import { createFileRoute } from "@tanstack/react-router";
import { askBuddyModel } from "@/lib/buddy-ai.server";
import type { Session } from "@/lib/bude";

const METHODS = new Set(["flower", "edible", "vape", "dab", "drink", "other"]);

function readSession(value: unknown): Session | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.method !== "string" || !METHODS.has(row.method)) return null;
  return {
    method: row.method as Session["method"],
    amount: typeof row.amount === "string" ? row.amount.slice(0, 24) : "",
    unit: row.unit === "g" ? "g" : "mg",
    unsure: row.unsure === true,
    timeTaken: typeof row.timeTaken === "string" ? row.timeTaken.slice(0, 16) : "",
    experience: row.experience === "new" || row.experience === "experienced" ? row.experience : "some",
  };
}

export const Route = createFileRoute("/api/buddy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "bad-json" }, { status: 400 });
        }
        const row = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        const message = typeof row.message === "string" ? row.message.trim().slice(0, 800) : "";
        if (!message) return Response.json({ error: "empty" }, { status: 400 });
        const history: { role: "user" | "bud"; text: string }[] = [];
        if (Array.isArray(row.history)) {
          for (const turn of row.history.slice(-8)) {
            if (!turn || typeof turn !== "object") continue;
            const item = turn as Record<string, unknown>;
            if ((item.role !== "user" && item.role !== "bud") || typeof item.text !== "string") continue;
            history.push({ role: item.role, text: item.text.slice(0, 800) });
          }
        }
        const result = await askBuddyModel({ message, history, session: readSession(row.session) });
        if (result.reply) return Response.json(result.reply);
        if (result.status === 429) return Response.json({ error: "quota" }, { status: 429 });
        return Response.json({ error: "unavailable" }, { status: 503 });
      },
    },
  },
});
