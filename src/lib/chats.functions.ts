import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { ChatThread } from "@/lib/chat-threads";

const ACTIONS = new Set(["timer", "breathe", "munchies"]);
const SAFETIES = new Set(["emergency", "pet", "drive", "too-high"]);

function cleanThread(value: unknown): ChatThread | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !/^[\w-]{8,80}$/.test(row.id)) return null;
  const title = typeof row.title === "string" ? row.title.trim().slice(0, 60) : "";
  const messages = Array.isArray(row.messages) ? row.messages.slice(-60) : [];
  const cleaned: ChatThread["messages"] = [];
  for (const item of messages) {
    if (!item || typeof item !== "object") continue;
    const msg = item as Record<string, unknown>;
    if ((msg.role !== "user" && msg.role !== "bud") || typeof msg.text !== "string") continue;
    const text = msg.text.trim().slice(0, 1200);
    if (!text || typeof msg.id !== "string") continue;
    cleaned.push({
      id: msg.id.slice(0, 80),
      role: msg.role,
      text,
      action: typeof msg.action === "string" && ACTIONS.has(msg.action) ? (msg.action as ChatThread["messages"][number]["action"]) : undefined,
      safety: typeof msg.safety === "string" && SAFETIES.has(msg.safety) ? (msg.safety as ChatThread["messages"][number]["safety"]) : undefined,
    });
  }
  return {
    id: row.id,
    title: title || "New chat",
    renamed: row.renamed === true,
    updatedAt: typeof row.updatedAt === "number" && Number.isFinite(row.updatedAt) ? row.updatedAt : Date.now(),
    messages: cleaned,
  };
}

export const pullChats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ChatThread[]> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const chats = await sql<{ id: string; title: string; renamed: boolean; updated_at: number }>`
      select id, title, renamed, updated_at from chats
      where user_id = ${context.userId}
      order by updated_at desc
      limit 40
    `;
    if (chats.length === 0) return [];
    const ids = new Set(chats.map((chat) => chat.id));
    const messages = await sql<{
      id: string;
      chat_id: string;
      role: string;
      body: string;
      action: string | null;
      safety: string | null;
      position: number;
    }>`
      select id, chat_id, role, body, action, safety, position from chat_messages
      where user_id = ${context.userId}
      order by position asc
    `;
    const byChat = new Map<string, ChatThread["messages"]>();
    for (const row of messages) {
      const list = byChat.get(row.chat_id) ?? [];
      if (!ids.has(row.chat_id) || (row.role !== "user" && row.role !== "bud")) continue;
      list.push({
        id: row.id,
        role: row.role,
        text: row.body,
        action: row.action && ACTIONS.has(row.action) ? (row.action as ChatThread["messages"][number]["action"]) : undefined,
        safety: row.safety && SAFETIES.has(row.safety) ? (row.safety as ChatThread["messages"][number]["safety"]) : undefined,
      });
      byChat.set(row.chat_id, list);
    }
    return chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      renamed: chat.renamed,
      updatedAt: Number(chat.updated_at),
      messages: byChat.get(chat.id) ?? [],
    }));
  });

export const saveChat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: ChatThread) => data)
  .handler(async ({ data, context }) => {
    const thread = cleanThread(data);
    if (!thread) return { ok: false as const };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const existing = await sql<{ updated_at: number }>`
      select updated_at from chats where id = ${thread.id} and user_id = ${context.userId}
    `;
    if (existing[0] && Number(existing[0].updated_at) > thread.updatedAt) return { ok: true as const };
    await sql`
      insert into chats (id, user_id, title, renamed, updated_at)
      values (${thread.id}, ${context.userId}, ${thread.title}, ${thread.renamed}, ${thread.updatedAt})
      on conflict (id) do update
      set title = excluded.title, renamed = excluded.renamed, updated_at = excluded.updated_at
      where chats.user_id = ${context.userId}
    `;
    await sql`delete from chat_messages where chat_id = ${thread.id} and user_id = ${context.userId}`;
    for (let i = 0; i < thread.messages.length; i++) {
      const msg = thread.messages[i];
      await sql`
        insert into chat_messages (id, chat_id, user_id, role, body, action, safety, position)
        values (${msg.id}, ${thread.id}, ${context.userId}, ${msg.role}, ${msg.text}, ${msg.action ?? null}, ${msg.safety ?? null}, ${i})
        on conflict (id) do update
        set body = excluded.body, action = excluded.action, safety = excluded.safety, position = excluded.position
        where chat_messages.user_id = ${context.userId}
      `;
    }
    return { ok: true as const };
  });

export const removeChat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((id: string) => id)
  .handler(async ({ data, context }) => {
    if (typeof data !== "string" || !/^[\w-]{8,80}$/.test(data)) return { ok: false as const };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from chats where id = ${data} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const wipeChats = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from chats where user_id = ${context.userId}`;
    return { ok: true as const };
  });
