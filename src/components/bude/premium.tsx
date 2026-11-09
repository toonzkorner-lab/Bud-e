import { useState } from "react";
import { PERSONAS, tierAtLeast } from "@/lib/premium";
import { TRACKS, type TrackId } from "@/lib/music";
import { sessionInsights } from "@/lib/insights";
import { Button } from "@/components/ui/button";
import { Card } from "./bits";
import { useBude } from "./provider";

export function PremiumPanel() {
  const {
    tier,
    previewTiers,
    buyTier,
    tryTier,
    persona,
    customName,
    customVoice,
    accent,
    themeName,
    setPersona,
    setAccent,
    makeCustom,
    journal,
    session,
    stash,
    track,
    setTrack,
  } = useBude();
  const [prompt, setPrompt] = useState("");
  const [color, setColor] = useState(accent || "#c6f25c");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<"lit" | "cloud" | "make" | null>(null);
  const lit = tierAtLeast(tier, "lit");
  const cloud = tierAtLeast(tier, "cloud");

  async function buy(next: "lit" | "cloud") {
    setBusy(next);
    setNote(null);
    const result = await buyTier(next);
    setBusy(null);
    if (result === "closed") setNote("Payments aren't connected on this publish yet.");
    if (result === "sent") setNote("Checkout is open.");
  }

  return (
    <div className="mt-3 space-y-3">
      <Card>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          {tier === "free" ? "Free" : tier === "lit" ? "Lit" : "Cloud Nine"}
        </p>
        <h2 className="mt-1 font-display text-3xl font-medium">Membership</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">One payment. It stays on this account.</p>
        {note && <p className="mt-2 text-sm">{note}</p>}
      </Card>

      {tier !== "cloud" && (
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-2xl font-medium">Lit</h3>
            <p className="text-sm font-semibold">$19</p>
          </div>
          <ul className="mt-3 space-y-1 text-sm leading-relaxed text-muted">
            <li>Extra voices, extra themes, and your own accent color.</li>
            <li>Session insights and unlimited saved plans.</li>
            <li>Early access.</li>
          </ul>
          <div className="mt-3 flex gap-2">
            {tier === "free" && (
              <Button size="sm" disabled={busy !== null} onClick={() => void buy("lit")}>
                {busy === "lit" ? "Opening" : "Get Lit"}
              </Button>
            )}
            {previewTiers && tier === "free" && (
              <Button size="sm" variant="secondary" onClick={() => void tryTier("lit")}>
                Try it here
              </Button>
            )}
          </div>
        </Card>
      )}

      {tier !== "cloud" && (
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-2xl font-medium">Cloud Nine</h3>
            <p className="text-sm font-semibold">$49</p>
          </div>
          <ul className="mt-3 space-y-1 text-sm leading-relaxed text-muted">
            <li>Everything in Lit.</li>
            <li>Music in the app.</li>
            <li>Every future premium feature, included.</li>
            <li>A persona and a theme made for you.</li>
          </ul>
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={busy !== null} onClick={() => void buy("cloud")}>
              {busy === "cloud" ? "Opening" : "Get Cloud Nine"}
            </Button>
            {previewTiers && (
              <Button size="sm" variant="secondary" onClick={() => void tryTier("cloud")}>
                Try it here
              </Button>
            )}
          </div>
        </Card>
      )}

      {cloud && previewTiers && (
        <Button size="sm" variant="ghost" onClick={() => void tryTier("free")}>
          Back to free
        </Button>
      )}

      <Card>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Voice</p>
        <div className="mt-3 grid gap-2">
          {PERSONAS.filter((item) => item.id !== "custom").map((item) => {
            const locked = !tierAtLeast(tier, item.tier);
            const on = persona === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={locked}
                onClick={() => setPersona(item.id)}
                className={`rounded-2xl border px-3 py-2 text-left ${on ? "border-accent" : "border-line"} disabled:opacity-50`}
              >
                <span className="text-sm font-semibold">{item.name}</span>
                <span className="mt-0.5 block text-xs text-muted">{locked ? "Lit" : item.detail}</span>
              </button>
            );
          })}
          {cloud && customName && (
            <p className="text-sm">
              <span className="font-semibold">{customName}</span>
              <span className="text-muted"> · {customVoice}</span>
            </p>
          )}
        </div>
      </Card>

      {lit && (
        <Card>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Accent</p>
          <p className="mt-2 text-sm text-muted">Your color, on whatever garden you picked.</p>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="color"
              aria-label="Accent color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="size-11 rounded-full border border-line bg-transparent"
            />
            <Button size="sm" variant="secondary" onClick={() => setAccent(color)}>
              Use this color
            </Button>
          </div>
          {themeName && <p className="mt-3 text-sm">Theme made for you: {themeName}.</p>}
        </Card>
      )}

      {lit && (
        <Card>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Insights</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed">
            {sessionInsights(journal, session, stash).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Card>
      )}

      {lit && (
        <Card>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Early</p>
          <p className="mt-2 text-sm font-semibold">Wind-down check</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li>Water is within reach.</li>
            <li>The snack is already chosen.</li>
            <li>The ride home is not you driving.</li>
          </ul>
        </Card>
      )}

      {cloud && (
        <Card>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Made for you</p>
          <p className="mt-2 text-sm text-muted">Say how you want Bud-E to sound. You get a persona and a theme from that.</p>
          <textarea
            value={prompt}
            aria-label="How should your persona sound"
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Quiet, a little dry, never a lecture."
            className="mt-3 min-h-20 w-full rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <Button
            className="mt-3"
            size="sm"
            disabled={busy === "make" || prompt.trim().length < 3}
            onClick={() => {
              setBusy("make");
              void makeCustom(prompt, color).finally(() => setBusy(null));
            }}
          >
            {busy === "make" ? "Making it" : "Make this mine"}
          </Button>
        </Card>
      )}

      {cloud && (
        <Card>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Music</p>
          <div className="mt-3 grid gap-2">
            {TRACKS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTrack(track === item.id ? null : (item.id as TrackId))}
                className={`rounded-2xl border px-3 py-2 text-left ${track === item.id ? "border-accent" : "border-line"}`}
              >
                <span className="text-sm font-semibold">{item.name}</span>
                <span className="mt-0.5 block text-xs text-muted">{track === item.id ? "Playing" : item.detail}</span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
