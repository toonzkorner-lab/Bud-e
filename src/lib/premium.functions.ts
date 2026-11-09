import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  isPersonaId,
  isTier,
  personaVoice,
  planLimit,
  tierAtLeast,
  type Membership,
  type PersonaId,
  type SavedPlan,
  type Tier,
} from "@/lib/premium";

const HEX = /^#[0-9a-fA-F]{6}$/;

type ProfileRow = {
  persona: string;
  custom_name: string | null;
  custom_voice: string | null;
  accent: string | null;
  theme_name: string | null;
};

function emptyMembership(preview: boolean, shop: boolean): Membership {
  return {
    tier: "free",
    persona: "bud",
    customName: "",
    customVoice: "",
    accent: "",
    themeName: "",
    plans: [],
    preview,
    shop,
  };
}

async function readMembership(userId: string): Promise<Membership> {
  const { getSql } = await import("@/lib/db");
  const { isWorkspacePreview } = await import("@/lib/env.server");
  const sql = await getSql();
  const preview = isWorkspacePreview();
  const shop = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const base = emptyMembership(preview, shop);
  const tierRows = await sql<{ tier: string }>`select tier from memberships where user_id = ${userId}`;
  const tier = isTier(tierRows[0]?.tier) ? tierRows[0].tier : "free";
  const profiles = await sql<ProfileRow>`
    select persona, custom_name, custom_voice, accent, theme_name from premium_profiles where user_id = ${userId}
  `;
  const profile = profiles[0];
  const persona = profile && isPersonaId(profile.persona) ? profile.persona : "bud";
  const plans = await sql<{ id: string; title: string; body: string; created_at: number }>`
    select id, title, body, created_at from saved_plans where user_id = ${userId} order by created_at desc limit 40
  `;
  return {
    ...base,
    tier,
    persona: tierAtLeast(tier, persona === "custom" ? "cloud" : persona === "bud" ? "free" : "lit") ? persona : "bud",
    customName: profile?.custom_name?.slice(0, 40) || "",
    customVoice: profile?.custom_voice?.slice(0, 280) || "",
    accent: profile?.accent && HEX.test(profile.accent) ? profile.accent : "",
    themeName: profile?.theme_name?.slice(0, 40) || "",
    plans: plans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      body: plan.body,
      createdAt: Number(plan.created_at),
    })),
  };
}

async function writeTier(userId: string, tier: Tier, source: string): Promise<void> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql`
    insert into memberships (user_id, tier, source, updated_at)
    values (${userId}, ${tier}, ${source}, ${Date.now()})
    on conflict (user_id) do update set tier = excluded.tier, source = excluded.source, updated_at = excluded.updated_at
  `;
}

export const getMembership = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Membership> => readMembership(context.userId));

export const grantPreviewTier = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((tier: Tier) => tier)
  .handler(async ({ data, context }) => {
    const { isWorkspacePreview } = await import("@/lib/env.server");
    if (!isWorkspacePreview() || (data !== "lit" && data !== "cloud" && data !== "free")) return { ok: false as const };
    if (data === "free") {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      await sql`delete from memberships where user_id = ${context.userId}`;
    } else {
      await writeTier(context.userId, data, "preview");
    }
    return { ok: true as const, membership: await readMembership(context.userId) };
  });

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((tier: Tier) => tier)
  .handler(async ({ data, context }) => {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key || (data !== "lit" && data !== "cloud")) return { ok: false as const, error: "closed" as const };
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const origin = getRequestUrl({ xForwardedHost: true, xForwardedProto: true }).origin;
    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", `${origin}/?premium={CHECKOUT_SESSION_ID}`);
    body.set("cancel_url", `${origin}/?premium=cancel`);
    body.set("client_reference_id", context.userId);
    body.set("metadata[userId]", context.userId);
    body.set("metadata[tier]", data);
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", "usd");
    body.set("line_items[0][price_data][unit_amount]", data === "lit" ? "1900" : "4900");
    body.set("line_items[0][price_data][product_data][name]", data === "lit" ? "Lit" : "Cloud Nine");
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) return { ok: false as const, error: "closed" as const };
    const payload = (await response.json()) as { url?: string };
    if (!payload.url) return { ok: false as const, error: "closed" as const };
    return { ok: true as const, url: payload.url };
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((id: string) => id)
  .handler(async ({ data, context }) => {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key || typeof data !== "string" || !data.startsWith("cs_")) return { ok: false as const };
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(data)}`, {
      headers: { authorization: `Bearer ${key}` },
    });
    if (!response.ok) return { ok: false as const };
    const payload = (await response.json()) as {
      payment_status?: string;
      metadata?: { userId?: string; tier?: string };
    };
    const tier = payload.metadata?.tier;
    if (payload.payment_status !== "paid" || payload.metadata?.userId !== context.userId) return { ok: false as const };
    if (tier !== "lit" && tier !== "cloud") return { ok: false as const };
    await writeTier(context.userId, tier, "stripe");
    return { ok: true as const, membership: await readMembership(context.userId) };
  });

export const saveLook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: { persona: PersonaId; accent: string }) => input)
  .handler(async ({ data, context }) => {
    const membership = await readMembership(context.userId);
    const persona = isPersonaId(data?.persona) ? data.persona : "bud";
    const need = persona === "custom" ? "cloud" : persona === "bud" ? "free" : "lit";
    if (!tierAtLeast(membership.tier, need)) return { ok: false as const };
    const accent = typeof data?.accent === "string" && HEX.test(data.accent) ? data.accent : "";
    if (accent && !tierAtLeast(membership.tier, "lit")) return { ok: false as const };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into premium_profiles (user_id, persona, custom_name, custom_voice, accent, theme_name)
      values (${context.userId}, ${persona}, ${membership.customName || null}, ${membership.customVoice || null}, ${accent || null}, ${membership.themeName || null})
      on conflict (user_id) do update set persona = excluded.persona, accent = excluded.accent
    `;
    return { ok: true as const, membership: await readMembership(context.userId) };
  });

export const makeMine = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: { prompt: string; accent: string }) => input)
  .handler(async ({ data, context }) => {
    const membership = await readMembership(context.userId);
    if (!tierAtLeast(membership.tier, "cloud")) return { ok: false as const };
    const prompt = typeof data?.prompt === "string" ? data.prompt.trim().slice(0, 280) : "";
    const accent = typeof data?.accent === "string" && HEX.test(data.accent) ? data.accent : "#c6f25c";
    if (prompt.length < 3) return { ok: false as const };
    let name = "Yours";
    let voice = prompt;
    const key = process.env.XAI_API_KEY?.trim();
    if (key) {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0.7,
          max_tokens: 180,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Turn the request into a cannabis-companion persona. Reply JSON with name and voice. name is 1-3 words. voice is one sentence of how they talk. No medical claims, no slang pile-up, no emojis. The persona must stay a calm 21+ companion.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
        const text = payload.choices?.[0]?.message?.content ?? "";
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start >= 0 && end > start) {
          try {
            const made = JSON.parse(text.slice(start, end + 1)) as { name?: string; voice?: string };
            if (typeof made.name === "string" && made.name.trim()) name = made.name.trim().slice(0, 40);
            if (typeof made.voice === "string" && made.voice.trim()) voice = made.voice.trim().slice(0, 280);
          } catch {
            /* keep their words */
          }
        }
      }
    }
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into premium_profiles (user_id, persona, custom_name, custom_voice, accent, theme_name)
      values (${context.userId}, ${"custom"}, ${name}, ${voice}, ${accent}, ${name})
      on conflict (user_id) do update set
        persona = excluded.persona,
        custom_name = excluded.custom_name,
        custom_voice = excluded.custom_voice,
        accent = excluded.accent,
        theme_name = excluded.theme_name
    `;
    return { ok: true as const, membership: await readMembership(context.userId) };
  });

export const savePlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: { title: string; body: string }) => input)
  .handler(async ({ data, context }) => {
    const membership = await readMembership(context.userId);
    if (membership.plans.length >= planLimit(membership.tier)) return { ok: false as const, error: "limit" as const };
    const title = typeof data?.title === "string" ? data.title.trim().slice(0, 80) : "";
    const body = typeof data?.body === "string" ? data.body.trim().slice(0, 2000) : "";
    if (!title || !body) return { ok: false as const, error: "empty" as const };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`
      insert into saved_plans (id, user_id, title, body, created_at)
      values (${id}, ${context.userId}, ${title}, ${body}, ${Date.now()})
    `;
    return { ok: true as const, membership: await readMembership(context.userId) };
  });

export const removePlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((id: string) => id)
  .handler(async ({ data, context }) => {
    if (typeof data !== "string") return { ok: false as const };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from saved_plans where id = ${data} and user_id = ${context.userId}`;
    return { ok: true as const, membership: await readMembership(context.userId) };
  });

export async function voiceForUser(userId: string): Promise<string> {
  const membership = await readMembership(userId);
  const persona = membership.persona;
  const name = persona === "custom" && membership.customName ? membership.customName : "";
  const voice = personaVoice(persona, membership.customVoice);
  return name ? `They call you ${name}. ${voice}` : voice;
}

export type { SavedPlan };
