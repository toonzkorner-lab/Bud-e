import type { BuddyAction, Safety } from "@/lib/bude";

export type ChatMessage = {
  id: string;
  role: "user" | "bud";
  text: string;
  action?: BuddyAction;
  safety?: Safety;
};

export type ChatThread = {
  id: string;
  title: string;
  renamed: boolean;
  updatedAt: number;
  messages: ChatMessage[];
};

export function blankThread(now = Date.now()): ChatThread {
  return { id: crypto.randomUUID(), title: "New chat", renamed: false, updatedAt: now, messages: [] };
}

export function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  return clean.length > 42 ? `${clean.slice(0, 41)}…` : clean;
}

export function cleanThread(value: unknown): ChatThread | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<ChatThread>;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;
  const messages = Array.isArray(row.messages)
    ? row.messages.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const msg = item as ChatMessage;
        if ((msg.role !== "user" && msg.role !== "bud") || typeof msg.text !== "string" || typeof msg.id !== "string") return [];
        return [msg];
      })
    : [];
  return {
    id: row.id,
    title: row.title.slice(0, 60) || "New chat",
    renamed: row.renamed === true,
    updatedAt: typeof row.updatedAt === "number" ? row.updatedAt : Date.now(),
    messages: messages.slice(-60),
  };
}

export function mergeThreads(local: ChatThread[], remote: ChatThread[]): ChatThread[] {
  const map = new Map<string, ChatThread>();
  for (const thread of remote) map.set(thread.id, thread);
  for (const thread of local) {
    const other = map.get(thread.id);
    if (!other || thread.updatedAt >= other.updatedAt) map.set(thread.id, thread);
  }
  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 40);
}
